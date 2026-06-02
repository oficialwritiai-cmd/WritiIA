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

function getPlatformRules(platform, duration) {
    const p = (platform || '').toLowerCase();
    if (p.includes('youtube') && !p.includes('short')) {
        return `PLATAFORMA: YouTube (vídeo largo ${duration || '5-10 min'}).
- Hook: pregunta o promesa poderosa en los primeros 15 segundos.
- Estructura: 6-8 bloques bien desarrollados con ejemplos reales, datos y storytelling.
- Cada bloque debe tener AL MENOS 3-4 frases de detalle concreto.
- Tono educativo-entretenido, profundo y con autoridad.
- CTA: suscribir + comentar + compartir.`;
    }
    if (p.includes('linkedin')) {
        return `PLATAFORMA: LinkedIn (vídeo profesional ${duration || '2-3 min'}).
- Hook: dato sorprendente o insight profesional en 10 segundos.
- Estructura: 4-5 bloques con casos reales de negocio, métricas y lecciones aprendidas.
- Cada bloque debe tener 3-5 frases con argumentos sólidos y ejemplos del sector.
- Tono: profesional, directo, orientado a resultados y ROI.
- CTA: conectar, comentar perspectiva, descargar recurso.`;
    }
    if (p.includes('tiktok')) {
        return `PLATAFORMA: TikTok (vídeo corto ${duration || '60 seg'}).
- Hook: las primeras 3 palabras deben enganchar brutalmente — sin intro.
- Estructura: 3-4 bloques rápidos pero con DETALLE REAL, no generalidades.
- Cada bloque: 2-3 frases concretas con ejemplo específico o número.
- Ritmo rápido, lenguaje generacional, directo al grano.
- CTA: seguir para más, guardar, comentar opinión.`;
    }
    return `PLATAFORMA: Instagram Reels / vídeo corto (${duration || '60-90 seg'}).
- Hook: pregunta provocadora o afirmación polémica en los primeros 5 segundos.
- Estructura: 4-5 bloques con contenido DENSO y ESPECÍFICO — nada genérico.
- Cada bloque debe tener 3-4 frases con dato real, ejemplo concreto o historia breve.
- Tono cercano pero con autoridad, como hablar a un amigo que necesita la verdad.
- CTA: guardar para después, compartir con alguien que lo necesite.`;
}

function buildPrompt(brain, platform, duration) {
    const platformRules = getPlatformRules(platform, duration);
    return `Eres un guionista profesional de élite especializado en contenido viral y educativo para redes sociales.
Tu misión: crear guiones COMPLETOS, DETALLADOS y ADAPTADOS a cada plataforma. NUNCA guiones genéricos o cortos.

PERFIL DEL CREADOR:
- Biografía: ${brain.biography || 'Experto en su sector'}
- Nicho: ${brain.niche || brain.niche_topics || 'Marketing y negocios'}
- Productos/Servicios: ${brain.products_services || brain.sells || ''}
- Audiencia: ${brain.audience || 'Emprendedores y profesionales'}
- Tono de marca: ${brain.values_tone || 'Profesional y cercano'}
- Estilo: ${brain.style_words || 'Directo, auténtico, sin postureo'}

${platformRules}

REGLAS DE CALIDAD ABSOLUTA:
1. El hook DEBE ser irresistible — si no engancha en 5 seg, no sirve.
2. Cada bloque de desarrollo debe tener contenido REAL y ESPECÍFICO (cifras, ejemplos, casos).
3. Nunca uses frases genéricas como "es muy importante" — ve directo al detalle.
4. El guión debe sonar como habla el creador, no como un robot.
5. Incluye copy para redes sociales optimizado con emojis y hashtags relevantes.
6. Devuelve ÚNICAMENTE el JSON válido, sin texto adicional.

FORMATO JSON OBLIGATORIO:
{
  "title": "título atractivo del vídeo",
  "hook": "frase de apertura que engancha en los primeros segundos — específica y poderosa",
  "structure": [
    { "point": "nombre del bloque/punto", "detail": "3-5 frases de contenido real y específico con ejemplos o datos concretos" },
    { "point": "...", "detail": "..." }
  ],
  "cta": "llamada a la acción específica y motivante (2-3 frases)",
  "post_copy": {
    "headline": "título del post con emojis",
    "body": "descripción del post de 3-5 líneas con valor real",
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
  },
  "notes": "sugerencias de grabación específicas para esta plataforma"
}`;
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

        // Generate with Claude Sonnet for quality long-form scripts
        const systemPrompt = buildPrompt(brain, platform, videoDuration);
        const userMessage = `Genera el guión completo y detallado para: "${idea_title}".
Contexto adicional: ${idea_description || '(sin contexto extra)'}.
Plataforma objetivo: ${platform || 'Reels'} — duración estimada: ${videoDuration || '60-90 seg'}.
${ctaIdea ? `CTA preferido: ${ctaIdea}` : ''}
Recuerda: el guión debe ser EXTENSO, con bloques bien desarrollados. No generes contenido corto o genérico.`;

        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 2000,
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
