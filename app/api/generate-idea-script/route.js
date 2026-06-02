import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-guard';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

function extractJson(text) {
    if (!text) return null;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
}

function buildPrompt(brain) {
    return `Eres un guionista profesional de contenido digital.
CREADOR: Bio: ${brain.biography || 'Creador digital'}. Nicho: ${brain.niche || 'Marketing'}. Tono: ${brain.values_tone || 'Cercano'}. Estilo: ${brain.style_words || 'Directo'}.
REGLAS: Hook impactante primeros 5s. 3-5 bloques con detalle real. CTA específico. Solo JSON.
FORMATO:
{"title":"...","hook":"...","structure":[{"point":"...","detail":"..."}],"cta":"...","post_copy":{"headline":"...","body":"...","hashtags":["#tag"]},"notes":"..."}`;
}

export async function POST(request) {
    try {
        const { user, supabase: sessionSupa } = await getServerSession(request);
        if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

        const body = await request.json();
        const { idea_title, idea_description, platform, projectId, videoDuration, ctaIdea } = body;

        if (!idea_title) return NextResponse.json({ error: 'idea_title requerido.' }, { status: 400 });

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Fetch brand brain
        let brain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brain = data;
        }
        if (!brain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', user.id).single();
            brain = data;
        }
        if (!brain) return NextResponse.json({ error: 'Configura tu Cerebro IA antes de generar guiones.' }, { status: 400 });

        // Credit check
        const { data: profile } = await supabase.from('users_profiles').select('credits_balance').eq('id', user.id).single();
        const balance = profile?.credits_balance ?? 0;
        const cost = CREDIT_COSTS.GENERATE_SCRIPT_SLOT ?? 1;
        if (balance < cost) return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });

        // Generate with Claude
        const systemPrompt = buildPrompt(brain);
        const userMessage = `Genera el guion para: "${idea_title}". Contexto: ${idea_description || ''}. Plataforma: ${platform || 'Reels'} (${videoDuration || '60 seg'}). CTA: ${ctaIdea || 'Guarda este video'}.`;

        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 3000,
                temperature: 0.75,
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }],
            }),
        });

        if (!aiRes.ok) {
            const err = await aiRes.json().catch(() => ({}));
            return NextResponse.json({ error: err.error?.message || 'Error de IA.' }, { status: 503 });
        }

        const aiData = await aiRes.json();
        let script = extractJson(aiData.content?.[0]?.text || '');

        // Fallback si la IA no devuelve JSON válido
        if (!script?.hook || !script?.structure?.length) {
            script = {
                title: idea_title,
                hook: `¿Sabías que ${idea_title.toLowerCase()}?`,
                structure: [
                    { point: 'El problema real', detail: `La mayoría no sabe cómo aplicar ${idea_title}. Aquí te explico el método.` },
                    { point: 'La solución', detail: `Con este sistema puedes lograr resultados en menos tiempo del que crees.` },
                    { point: 'Acción concreta', detail: `Empieza hoy mismo con este primer paso simple y medible.` },
                ],
                cta: ctaIdea || 'Guarda este video y compártelo con alguien que lo necesite.',
                post_copy: { headline: idea_title, body: `Todo sobre: ${idea_title}`, hashtags: ['contenido', 'ia', 'marketing'] },
                notes: 'Graba en vertical, buena luz.'
            };
        }

        // Charge credits after success
        await chargeCredits(supabase, user.id, cost, 'generate_script_slot', projectId || null).catch(() => {});

        // Save to library
        const fullText = [
            `🎬 ${script.title || idea_title}`,
            `\n⚡ HOOK:\n${script.hook}`,
            `\n📝 DESARROLLO:\n${(script.structure || []).map((b, i) => `${i + 1}. ${b.point}\n   ${b.detail}`).join('\n')}`,
            `\n📢 CTA:\n${script.cta}`,
            script.post_copy?.headline ? `\n📱 COPY:\n${script.post_copy.headline}\n${script.post_copy.body || ''}` : '',
        ].filter(Boolean).join('\n');

        let libraryId = null;
        try {
            const { data: lib } = await supabase.from('library').insert({
                user_id: user.id,
                project_id: projectId || null,
                type: 'guion',
                platform: platform || 'Reels',
                goal: 'engagement',
                titulo: script.title || idea_title,
                script_full_text: fullText,
                content: {
                    titulo_guion: script.title || idea_title,
                    hook: script.hook,
                    gancho: script.hook,
                    desarrollo: (script.structure || []).map(b => `${b.point}: ${b.detail}`),
                    cta: script.cta,
                    copy_post: script.post_copy || {},
                },
            }).select('id').single();
            libraryId = lib?.id || null;
        } catch (_) {}

        return NextResponse.json({
            ok: true,
            script: { ...script, library_id: libraryId },
            script_data: {
                hook: script.hook,
                desarrollo: (script.structure || []).map(b => `${b.point}: ${b.detail}`),
                cta: script.cta,
                copy_post: script.post_copy || {},
            },
            full_text: fullText,
        });

    } catch (err) {
        console.error('[generate-idea-script]', err?.message);
        return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
    }
}
