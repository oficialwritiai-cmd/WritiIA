// app/api/slots/[slot_id]/generate-script/route.js
// Plan Mensual v2: 1-click script generation per slot
// Guaranteed non-empty content with retry + validation

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const RequestSchema = z.object({
    userId: z.string().uuid('ID de usuario inválido'),
    platform: z.string().max(50).optional(),
    videoDuration: z.enum(['30 seg', '60 seg', '90 seg', '2 min', '3 min', '5 min']).default('60 seg'),
    focus: z.string().max(100).optional().default('autoridad'),
    ctaIdea: z.string().max(500).optional().nullable(),
});

// ─── Validate AI JSON response ────────────────────────────────────────────────
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

// ─── Extract JSON from raw AI text ────────────────────────────────────────────
function extractJson(text) {
    if (!text) return null;
    // Try to find a JSON object in the response
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
        return JSON.parse(match[0]);
    } catch {
        return null;
    }
}

// ─── Call Anthropic with retries ───────────────────────────────────────────────
async function callAnthropicWithRetries({ apiKey, systemPrompt, userMessage, maxRetries = 3 }) {
    const cleanKey = (apiKey || '').replace(/['"\s]/g, '').trim();
    let lastError = null;
    let model = 'claude-3-5-sonnet-20240620';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`[slots/generate-script] Retry ${attempt}/${maxRetries} in ${delay}ms (model: ${model})...`);
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
                console.error(`[slots/generate-script] API Error (attempt ${attempt}):`, JSON.stringify(err));

                // Fallback to Haiku on model tier issues
                if ((errMsg.includes('model') || response.status === 400) && model !== 'claude-3-haiku-20240307') {
                    console.warn(`[slots/generate-script] EMERGENCY FALLBACK to Haiku`);
                    model = 'claude-3-haiku-20240307';
                    continue;
                }

                // Rate limit / overload → retry
                if (response.status === 429 || response.status === 529) {
                    lastError = new Error('IA sobrecargada. Reintentando...');
                    continue;
                }

                throw new Error(err.error?.message || 'Error de API de Anthropic');
            }

            const data = await response.json();
            const rawText = data.content?.[0]?.text || '';
            console.log(`[slots/generate-script] RAW AI response (${rawText.length} chars):`, rawText.substring(0, 200));
            return rawText;

        } catch (err) {
            console.error(`[slots/generate-script] Catch (attempt ${attempt}):`, err.message);
            lastError = err;
            if (attempt === maxRetries) throw err;
        }
    }

    throw lastError || new Error('Error al conectar con la IA');
}

// ─── Build the system prompt ────────────────────────────────────────────────
function buildSystemPrompt(brandBrain) {
    return `Eres un experto en creación de contenido digital y guionista profesional de alto nivel.
Tu misión: escribir un guion completo, auténtico y adaptado a la plataforma indicada.

CONTEXTO DEL CREADOR:
- Bio: ${brandBrain.biography || 'Creador de contenido digital'}
- Nicho: ${brandBrain.niche || brandBrain.niche_topics || 'Marketing digital'}
- Audiencia: ${brandBrain.audience || 'Emprendedores y creadores'}
- Tono de marca: ${brandBrain.values_tone || 'Profesional y cercano'}
- Estilo: ${brandBrain.style_words || 'Directo, sin postureo'}
- Productos/Servicios: ${brandBrain.products_services || 'No especificado'}

REGLAS ABSOLUTAS (NO NEGOCIABLES):
1. El guion está basado EXCLUSIVAMENTE en la idea indicada. No mezcles temas.
2. El hook DEBE capturar atención en los primeros 5 segundos. Cero saludos, cero presentaciones.
3. La estructura debe tener entre 3 y 5 bloques. Cada bloque con detail de mínimo 50 palabras.
4. El CTA debe ser directo, específico y accionable.
5. El post_copy debe estar redactado para LEER (no para escuchar). Distinto al guion.
6. Las notes deben incluir mínimo 2 sugerencias de b-roll o recurso visual concreto.
7. NUNCA dejes secciones vacías. Construye desde el nicho si falta contexto.
8. NUNCA uses "Hola, soy X", "No olvides dar like", frases comodín o genéricas.
9. El tono DEBE coincidir con el estilo del creador: ${brandBrain.values_tone || 'directo y cercano'}.
10. Devuelve ÚNICAMENTE el JSON. Sin markdown, sin texto fuera del JSON.

FORMATO DE RESPUESTA (JSON estricto, sin texto adicional):
{
  "title": "Título definitivo del video (máx. 10 palabras, magnético)",
  "hook": "Frase(s) de apertura. Máx 40 palabras. Genera tensión o curiosidad inmediata.",
  "structure": [
    { "point": "Nombre corto del bloque", "detail": "Desarrollo del punto. Mínimo 50 palabras. Concreto, con ejemplos o datos." },
    { "point": "Nombre corto del bloque", "detail": "..." },
    { "point": "Nombre corto del bloque", "detail": "..." }
  ],
  "cta": "Instrucción final al espectador. Específica, accionable.",
  "post_copy": {
    "headline": "Primera línea del post (gancho para texto)",
    "body": "Cuerpo del post: 3-5 párrafos cortos, conversacional, para redes sociales.",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
  },
  "notes": "Instrucciones de grabación: plano recomendado, ritmo, b-roll (ej: muestra tu pantalla cuando menciones X), momentos de énfasis, transiciones."
}`;
}

// ─── Main handler ───────────────────────────────────────────────────────────
export async function POST(request, { params }) {
    const { slot_id } = params;
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
        }

        const validation = RequestSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.', details: validation.error.flatten() }, { status: 400 });
        }

        const { userId, platform, videoDuration, focus, ctaIdea } = validation.data;

        // ─── 1. Fetch slot and verify ownership ──────────────────────────────
        const { data: slot, error: slotErr } = await supabase
            .from('content_slots')
            .select('*')
            .eq('id', slot_id)
            .eq('user_id', userId)
            .single();

        if (slotErr || !slot) {
            return NextResponse.json({ error: 'Slot no encontrado o sin permisos.' }, { status: 404 });
        }

        // ─── 2. Fetch brand brain (project-scoped first, fallback to global) ─
        let brandBrain = null;
        if (slot.project_id) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', slot.project_id).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            return NextResponse.json({ error: 'Falta configuración del Cerebro IA. Ve al Paso 1.' }, { status: 400 });
        }

        // ─── 3. Mark slot as generating ─────────────────────────────────────
        await supabase.from('content_slots')
            .update({ slot_status: 'script_generating' })
            .eq('id', slot_id);

        // ─── 4. Build prompts ────────────────────────────────────────────────
        const systemPrompt = buildSystemPrompt(brandBrain);
        const finalPlatform = platform || slot.platform || 'Reels';
        const userMessage = `Genera el guion para esta idea:

IDEA DEL DÍA:
- Título: ${slot.idea_title}
- Descripción / contexto: ${slot.idea_description || 'Desarrolla desde el nicho del creador.'}
- Tipo de contenido: ${slot.content_type || 'educativo'}
- Objetivo del video: ${slot.goal || 'engagement'}
- Plataforma: ${finalPlatform} (duración aprox: ${videoDuration})
- Enfoque elegido: ${focus}
- CTA deseado: ${ctaIdea || 'Invita a seguir o guardar el video'}

Adapta el guion a la plataforma ${finalPlatform} con duración de ${videoDuration}.
Recuerda: devuelve SOLO el JSON. Ningún texto antes o después.`;

        // ─── 5. Call AI with retries ─────────────────────────────────────────
        let rawText;
        try {
            rawText = await callAnthropicWithRetries({
                apiKey: process.env.ANTHROPIC_API_KEY,
                systemPrompt,
                userMessage,
            });
        } catch (aiErr) {
            console.error('[slots/generate-script] AI failed completely:', aiErr.message);
            await supabase.from('content_slots')
                .update({ slot_status: 'script_error' })
                .eq('id', slot_id);
            return NextResponse.json({ error: 'La IA no pudo generar el guion. Inténtalo de nuevo.', code: 'AI_FAILED' }, { status: 503 });
        }

        // ─── 6. Parse and validate JSON ──────────────────────────────────────
        let scriptData = extractJson(rawText);

        // Retry once if validation fails
        if (!validateScriptJson(scriptData)) {
            console.warn('[slots/generate-script] JSON validation failed on first try. Retrying once...');
            try {
                const retryText = await callAnthropicWithRetries({
                    apiKey: process.env.ANTHROPIC_API_KEY,
                    systemPrompt,
                    userMessage: userMessage + '\n\nIMPORTANTE: Tu respuesta anterior falló la validación. Asegúrate de incluir TODAS las secciones con contenido real y de devolver JSON válido.',
                    maxRetries: 1,
                });
                scriptData = extractJson(retryText);
            } catch {
                // Will use fallback below
            }
        }

        // Emergency fallback if still invalid
        if (!validateScriptJson(scriptData)) {
            console.error('[slots/generate-script] CRITICAL: AI returned invalid JSON twice. Using emergency fallback.');
            scriptData = {
                title: slot.idea_title,
                hook: `¿Sabías que ${slot.idea_title?.toLowerCase()} puede cambiar completamente tu forma de trabajar? Hoy te cuento por qué.`,
                structure: [
                    { point: 'El problema real', detail: `La mayoría de personas ignoran la importancia de ${slot.idea_title}. Aquí está lo que nadie te dice: sin esto, estás dejando dinero y oportunidades sobre la mesa cada semana. Y el cambio es más simple de lo que crees.` },
                    { point: 'La solución que funciona', detail: `La clave está en aplicar un sistema probado, no en trabajar más horas. Te explico paso a paso cómo implementarlo desde cero, sin necesitar experiencia previa ni herramientas caras.` },
                    { point: 'Cómo empezar hoy', detail: `No tienes que esperar al lunes ni al mes que viene. Con 30 minutos al día y la estrategia correcta, empezarás a ver resultados en menos de dos semanas. Así es exactamente como lo hago yo con mis clientes.` },
                ],
                cta: ctaIdea || `Guarda este video y compártelo con alguien que lo necesite. Te leo en los comentarios 👇`,
                post_copy: {
                    headline: slot.idea_title,
                    body: `${slot.idea_description || slot.idea_title}\n\nEsto es lo que marca la diferencia entre los que avanzan y los que siguen igual.\n\nGuarda este post para cuando lo necesites.`,
                    hashtags: ['ia', 'emprendimiento', 'contenido', 'estrategia', 'crecimiento']
                },
                notes: `Graba en vertical. Usa b-roll de tu pantalla o escritorio trabajando. Pausa dramática antes del CTA. Mantén energía alta en el hook.`,
            };
        }

        // ─── 7. Save script to scripts table ─────────────────────────────────
        const { data: savedScript, error: scriptErr } = await supabase
            .from('scripts')
            .insert({
                user_id: userId,
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
                // Legacy fields for backward compatibility
                topic: slot.idea_title,
                tone: brandBrain.values_tone || 'Profesional',
                gancho: scriptData.hook,
                cta: scriptData.cta,
                content: [
                    `TÍTULO: ${scriptData.title}`,
                    '',
                    '🎯 HOOK',
                    scriptData.hook,
                    '',
                    '📝 ESTRUCTURA',
                    ...scriptData.structure.map((p, i) => `${i + 1}. ${p.point}: ${p.detail}`),
                    '',
                    '🔥 CTA',
                    scriptData.cta,
                    '',
                    '📱 POST COPY',
                    scriptData.post_copy?.headline || '',
                    scriptData.post_copy?.body || '',
                    (scriptData.post_copy?.hashtags || []).map(h => `#${h}`).join(' '),
                    '',
                    '🎬 NOTAS DE GRABACIÓN',
                    scriptData.notes || '',
                ].join('\n'),
                is_saved: true,
                scheduled_date: slot.scheduled_date,
            })
            .select()
            .single();

        if (scriptErr) {
            console.error('[slots/generate-script] Error saving script:', scriptErr);
            await supabase.from('content_slots').update({ slot_status: 'script_error' }).eq('id', slot_id);
            return NextResponse.json({ error: 'Error al guardar el guion en la base de datos.' }, { status: 500 });
        }

        // ─── 8. Update slot to script_ready ─────────────────────────────────
        await supabase.from('content_slots')
            .update({
                slot_status: 'script_ready',
                has_script: true,
                script_id: savedScript.id,
                script_data: {
                    hook: scriptData.hook,
                    gancho: scriptData.hook,
                    desarrollo: scriptData.structure.map(p => `${p.point}: ${p.detail}`),
                    cta: scriptData.cta,
                    cierre: scriptData.cta,
                    copy_post: scriptData.post_copy,
                    notes: scriptData.notes,
                }
            })
            .eq('id', slot_id);

        console.log(`[slots/generate-script] ✅ Script generated for slot "${slot.idea_title}" → script_id: ${savedScript.id}`);

        return NextResponse.json({
            ok: true,
            script: {
                id: savedScript.id,
                ...scriptData,
                platform: finalPlatform,
                video_duration: videoDuration,
            },
            slot_status: 'script_ready',
        });

    } catch (err) {
        console.error('[slots/generate-script] Unhandled error:', err?.message);
        // Try to mark slot as error
        try {
            await supabase.from('content_slots').update({ slot_status: 'script_error' }).eq('id', slot_id);
        } catch { /* ignore */ }
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
