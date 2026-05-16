import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { z } from 'zod';

const RequestSchema = z.object({
    platform: z.string().max(50).optional(),
    videoDuration: z.enum(['30 seg', '60 seg', '90 seg', '2 min', '3 min', '5 min', '10 min']).default('60 seg'),
    focus: z.string().max(100).optional().default('autoridad'),
    instruction: z.string().max(1000).optional().nullable(),
    ctaIdea: z.string().max(500).optional().nullable(),
    userId: z.string().uuid('ID de usuario inválido').optional().nullable(),
});

function validateScriptJson(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (!obj.title || obj.title.trim().length < 5) return false;
    if (!obj.hook || obj.hook.trim().length < 20) return false;
    if (!Array.isArray(obj.structure) || obj.structure.length < 2) return false;
    if (!obj.structure.every(p => p.point && p.detail && p.detail.trim().length > 30)) return false;
    if (!obj.cta || obj.cta.trim().length < 10) return false;
    if (!obj.post_copy?.headline || !obj.post_copy?.body) return false;
    return true;
}

function extractJson(text) {
    if (!text) return null;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

async function callAnthropicWithRetries({ apiKey, systemPrompt, userMessage, maxRetries = 3 }) {
    const cleanKey = (apiKey || '').replace(/['"\s]/g, '').trim();
    let lastError = null;
    let model = 'claude-sonnet-4-6';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(r => setTimeout(r, delay));
        }

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': cleanKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model,
                    max_tokens: 4096,
                    temperature: 0.75,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userMessage }],
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                const errMsg = (err.error?.message || '').toLowerCase();
                if ((errMsg.includes('model') || response.status === 400) && model !== 'claude-haiku-4-5-20251001') {
                    model = 'claude-haiku-4-5-20251001';
                    continue;
                }
                if (response.status === 429 || response.status === 529) {
                    lastError = new Error('IA sobrecargada. Reintentando...');
                    continue;
                }
                throw new Error(err.error?.message || 'Error de API de Anthropic');
            }

            const data = await response.json();
            return data.content?.[0]?.text || '';

        } catch (err) {
            lastError = err;
            if (attempt === maxRetries) throw err;
        }
    }
    throw lastError || new Error('Error al conectar con la IA');
}

function buildSystemPrompt(brandBrain) {
    return `Eres un experto en creación de contenido digital y guionista profesional de alto nivel.
Tu misión: escribir un guion completo, auténtico y adaptado a la plataforma indicada.

CONTEXTO DEL CREADOR:
- Bio: ${brandBrain.biography || 'Creador de contenido digital'}
- Nicho: ${brandBrain.niche || brandBrain.niche_topics || 'Marketing digital'}
- Tono de marca: ${brandBrain.values_tone || 'Profesional y cercano'}
- Estilo: ${brandBrain.style_words || 'Directo, sin postureo'}

REGLAS ABSOLUTAS:
1. El guion está basado EXCLUSIVAMENTE en la idea indicada.
2. El hook DEBE capturar atención en los primeros 5 segundos.
3. Estructura de 3-5 bloques con detalle real.
4. El CTA debe ser directo y específico.
5. El tono DEBE coincidir con el estilo del creador.
6. Devuelve ÚNICAMENTE el JSON.

FORMATO JSON:
{
  "title": "...",
  "hook": "...",
  "structure": [
    { "point": "...", "detail": "..." }
  ],
  "cta": "...",
  "post_copy": {
    "headline": "...",
    "body": "...",
    "hashtags": ["#tag1"]
  },
  "notes": "..."
}`;
}

export async function POST(request, { params }) {
    const { slot_id } = params;

    try {
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
        }

        const validation = RequestSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        // ── Auth via cookies (browser) ────────────────────────────────
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { cookies: { get: (n) => cookieStore.get(n)?.value } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return unauthorized();

        const { data: slot, error: slotErr } = await supabase
            .from('content_slots')
            .select('*')
            .eq('id', slot_id)
            .eq('user_id', user.id) // Verify owner
            .single();

        if (slotErr || !slot) {
            return NextResponse.json({ error: 'Slot no encontrado o sin permisos.' }, { status: 404 });
        }

        const verifiedUserId = user.id;

        // Verify project access if slot has project_id
        if (slot.project_id) {
            const hasAccess = await verifyProjectAccess(supabase, slot.project_id, user.id);
            if (!hasAccess) return forbidden('No tienes permiso para acceder a este proyecto.');
        }

        // ─── 2. Fetch brand brain ──────────────────────────────
        let brandBrain = null;
        if (slot.project_id) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', slot.project_id).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', verifiedUserId).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            return NextResponse.json({ error: 'Falta configuración del Cerebro IA.' }, { status: 400 });
        }

        // ─── 3. Mark slot as generating ─────────────────────────────────────
        await supabase.from('content_slots')
            .update({ slot_status: 'script_generating' })
            .eq('id', slot_id);

        const { platform, videoDuration, focus, ctaIdea, instruction } = validation.data;
        const systemPrompt = buildSystemPrompt(brandBrain);
        const finalPlatform = platform || slot.platform || 'Reels';
        const userMessage = `Genera el guion para: ${slot.idea_title}. Contexto: ${slot.idea_description || ''}. Plataforma: ${finalPlatform} (${videoDuration}). Enfoque: ${focus}. CTA: ${ctaIdea || ''}.${instruction ? ` INSTRUCCIONES DE MEJORA: ${instruction}` : ''}`;

        // ─── 4. Charge Credits BEFORE calling AI ─────────────────────────────
        const creditResult = await chargeCredits(supabase, verifiedUserId, CREDIT_COSTS.GENERATE_SCRIPT_SLOT, 'generate_script_slot', slot.project_id);
        if (!creditResult.success) {
            return NextResponse.json({
                error: 'No tienes créditos suficientes para generar este guion. Compra más créditos para continuar.',
                code: 'INSUFFICIENT_CREDITS',
            }, { status: 402 });
        }

        // ─── 5. Call AI ─────────────────────────────────────────
        let rawText;
        try {
            rawText = await callAnthropicWithRetries({
                apiKey: process.env.ANTHROPIC_API_KEY,
                systemPrompt,
                userMessage,
            });
        } catch (aiErr) {
            await supabase.from('content_slots').update({ slot_status: 'script_error' }).eq('id', slot_id);
            return NextResponse.json({ error: 'La IA no pudo generar el guion.', code: 'AI_FAILED' }, { status: 503 });
        }

        let scriptData = extractJson(rawText);

        // Emergency fallback if invalid
        if (!validateScriptJson(scriptData)) {
            scriptData = {
                title: slot.idea_title,
                hook: `¿Sabías que ${slot.idea_title?.toLowerCase()} puede cambiar completamente tu forma de trabajar?`,
                structure: [
                    { point: 'Punto Clave', detail: `La clave está en aplicar un sistema probado para ${slot.idea_title}. Esto es lo que marca la diferencia.` },
                    { point: 'Cómo aplicar', detail: `Implementar esto hoy mismo te ahorrará horas de trabajo y frustración.` }
                ],
                cta: ctaIdea || `Guarda este video para después.`,
                post_copy: {
                    headline: slot.idea_title,
                    body: `Estrategia ganadora para ${slot.idea_title}.`,
                    hashtags: ['estrategia', 'contenido', 'ia']
                },
                notes: `Graba en vertical.`
            };
        }

        // ─── Save script ─────────────────────────────────
        const { data: savedScript, error: scriptErr } = await supabase
            .from('scripts')
            .insert({
                user_id: verifiedUserId,
                slot_id: slot_id,
                project_id: slot.project_id,
                platform: finalPlatform,
                video_duration: videoDuration,
                focus,
                title: scriptData.title,
                hook: scriptData.hook,
                structure: scriptData.structure,
                cta: scriptData.cta,
                notes: scriptData.notes,
                post_copy: scriptData.post_copy,
                topic: slot.idea_title,
                content: `Guion generado para ${slot.idea_title}`,
                is_saved: true,
                scheduled_date: slot.scheduled_date,
            })
            .select()
            .single();

        if (scriptErr) throw scriptErr;

        await supabase.from('content_slots')
            .update({
                slot_status: 'script_ready',
                has_script: true,
                script_id: savedScript.id,
                script_data: {
                    hook: scriptData.hook,
                    desarrollo: scriptData.structure.map(p => `${p.point}: ${p.detail}`),
                    cta: scriptData.cta,
                    copy_post: scriptData.post_copy,
                    notes: scriptData.notes,
                }
            })
            .eq('id', slot_id);

        return NextResponse.json({ ok: true, script: { id: savedScript.id, ...scriptData } });

    } catch (err) {
        console.error('[slots/generate-script] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
