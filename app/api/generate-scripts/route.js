import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GenerateScriptSchema } from '@/lib/validations';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { generateScriptsWithSonnet, generateScriptsLong } from '@/lib/anthropic';
import { chargeCredits, getScriptCost } from '@/lib/credits';

const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500 });

// ─────────────────────────────────────────────
// Word targets per duration — used to validate
// that the AI actually produced enough content.
// (150 words/min speaking pace, slightly faster for short formats)
// ─────────────────────────────────────────────
const WORDS_PER_DURATION = {
    '30 seg': 70,
    '60 seg': 140,
    '90 seg': 200,
    '2 min': 280,
    '3 min': 420,
    '5 min': 700,
};

// Minimum acceptable ratio before we trigger an expansion call
const MIN_WORD_RATIO = 0.55;

function countScriptWords(script) {
    const parts = [
        script.gancho || '',
        ...(Array.isArray(script.desarrollo) ? script.desarrollo : []),
        script.cierre || '',
        script.cta || '',
    ];
    return parts.join(' ').split(/\s+/).filter(Boolean).length;
}

function buildSystemPrompt({ brandContextString, videoDuration, platform, tone, intensity, count, specificDetails }) {
    // Structure rules vary by duration
    const duracionRules = videoDuration === '30 seg' || videoDuration === '60 seg'
        ? `- DURACIÓN: ${videoDuration} → UN solo gancho potente, 3 frases de desarrollo concisas, CTA rápido. Max ~${WORDS_PER_DURATION[videoDuration] * 1.15} palabras en total.`
        : videoDuration === '90 seg' || videoDuration === '2 min'
            ? `- DURACIÓN: ${videoDuration} → Gancho, desarrollo 4-5 puntos con ejemplos breves, cierre emocional, CTA. ~${WORDS_PER_DURATION[videoDuration]} palabras.`
            : `- DURACIÓN: ${videoDuration} (YouTube largo) → Estructura completa: Intro (incógnita), 5-7 bloques de desarrollo con ejemplos reales/datos, Conclusión, CTA extendido. Mínimo ${WORDS_PER_DURATION[videoDuration]} palabras en total. Añade transiciones entre secciones.`;

    const specificDetailsBlock = specificDetails && specificDetails.trim()
        ? `\nDETALLES Y TEMAS ESPECÍFICOS A CUBRIR (OBLIGATORIO mencionarlos uno por uno):\n${specificDetails.trim()}\n- Para listas tipo "mejores herramientas/IA": nombra herramientas reales, descríbelas brevemente y explica por qué son buenas.\n- NUNCA uses frases vacías como "es muy importante…" sin explicar el por qué.`
        : '';

    return `Eres un estratega de contenido viral. Creas guiones auténticos, directos y profundos.
NUNCA uses frases genéricas como "en este video te enseñaré", "es fundamental", "es clave destacar" sin dar un motivo concreto.
Suena como un creador joven y auténtico hablando a cámara.

${brandContextString}

REGLAS DE DURACIÓN Y ESTRUCTURA:
${duracionRules}

${specificDetailsBlock}

REGLAS GLOBALES:
1. El GANCHO (primeras palabras) debe ser visual, impactante y prometer una transformación o revelar algo sorprendente. Mínimo 12 palabras.
2. El DESARROLLO debe tener ejemplos concretos, microhistorias o datos reales. Sin consejos vagos.
3. El CIERRE conecta el tema con la identidad del seguidor (emoción o aprendizaje).
4. El CTA SIEMPRE debe ser específico: comentar una palabra, guardar, enviar DM, visitar link, descargar, etc. NUNCA uses "sígueme" a secas.
5. Intensidad del hook: ${intensity}/5.

GENERA EXACTAMENTE ${count} GUION${count > 1 ? 'ES' : ''} DISTINTOS para ${platform} con tono ${tone}.

RESPONDE ÚNICAMENTE con un JSON array válido. Formato exacto:
[
  {
    "titulo_guion": "Título del guion",
    "video_duration": "${videoDuration}",
    "gancho": "Hook impactante de mínimo 12 palabras",
    "desarrollo": [
      "Punto 1 detallado con ejemplo concreto",
      "Punto 2 detallado con dato o historia",
      "Punto 3 detallado (añadir más bloques si la duración lo requiere)"
    ],
    "cierre": "Cierre emocional que conecta con la identidad del seguidor",
    "cta": "CTA específico y accionable (no genérico)",
    "copy_post": {
      "titulo": "Título del post/reel",
      "descripcion_larga": "Texto persuasivo para pie de foto",
      "hashtags": ["#tag1", "#tag2", "#tag3"]
    }
  }
]`;
}

export async function POST(request) {
    try {
        const ip = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();

        let body;
        try { body = await request.json(); }
        catch { return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 }); }

        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 15, buildRateLimitKey(ip, body?.userId));
        } catch {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const validation = GenerateScriptSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const {
            topic, platform, tone, userId, hookType, intensity,
            count, videoDuration, specificDetails, victory, opinion, story, awareness
        } = validation.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Credit Check & Charge (Dynamic Cost)
        const totalCost = getScriptCost(videoDuration, count || 1);
        const creditResult = await chargeCredits(supabase, userId, totalCost, 'generate_scripts');
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Fetch Brand Brain
        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();

        if (!brandBrain) {
            return NextResponse.json({ error: 'Falta configuración de Cerebro IA (Paso 1).' }, { status: 400 });
        }

        // Rich brand context including personal details
        let brandContextString = `[CONTEXTO BASE DEL CREADOR]
- Bio: ${brandBrain.biography || ''}
- Estilo: ${brandBrain.style_words || ''}
- Tono de marca: ${brandBrain.values_tone || ''}
- Audiencia: ${brandBrain.audience || ''}`;

        if (victory) brandContextString += `\n- Victoria/Fracaso reciente: ${victory}`;
        if (opinion) brandContextString += `\n- Opinión impopular a integrar: ${opinion}`;
        if (story) brandContextString += `\n- Caso real/Historia: ${story}`;
        if (awareness) brandContextString += `\n- Nivel de awareness de la audiencia: ${awareness}`;

        // Pick the right generator based on duration
        const isLongScript = videoDuration === '3 min' || videoDuration === '5 min';
        const generateFn = isLongScript ? generateScriptsLong : generateScriptsWithSonnet;

        const targetWords = WORDS_PER_DURATION[videoDuration] || 140;
        const finalCount = count || 1;

        const systemPrompt = buildSystemPrompt({
            brandContextString, videoDuration, platform, tone, intensity: intensity || 3,
            count: finalCount, specificDetails
        });

        const userMessage = `Tema central: ${topic}. Tipo de gancho preferido: ${hookType || 'curiosidad extrema'}.`;

        // ── FIRST CALL ──────────────────────────────────────
        let { parsed: results } = await generateFn({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        let scriptsArray = Array.isArray(results) ? results : (results ? [results] : []);

        // ── FIX COUNT BUG: if fewer scripts returned, retry for the missing ones ──
        if (scriptsArray.length < finalCount) {
            const missing = finalCount - scriptsArray.length;
            console.log(`[generate-scripts] Got ${scriptsArray.length}/${finalCount}. Requesting ${missing} more…`);

            const retryPrompt = buildSystemPrompt({
                brandContextString, videoDuration, platform, tone, intensity: intensity || 3,
                count: missing, specificDetails
            });
            const retryMsg = `${userMessage} (VARIANTES DISTINTAS a las ya generadas, distintos ángulos)`;

            const { parsed: retryResults } = await generateFn({
                apiKey: process.env.ANTHROPIC_API_KEY,
                systemPrompt: retryPrompt,
                userMessage: retryMsg,
            });
            const retryScripts = Array.isArray(retryResults) ? retryResults : (retryResults ? [retryResults] : []);
            scriptsArray = [...scriptsArray, ...retryScripts].slice(0, finalCount);
        }

        // ── WORD COUNT VALIDATION: expand short scripts ──────
        const minWords = Math.floor(targetWords * MIN_WORD_RATIO);
        const needsExpansion = scriptsArray.some(s => countScriptWords(s) < minWords);

        if (needsExpansion) {
            console.log(`[generate-scripts] Word count too low for ${videoDuration}. Requesting expansion…`);
            const expandPrompt = `El guion que generaste es DEMASIADO CORTO para ${videoDuration}.
Expande CADA bloque de desarrollo con más información, ejemplos concretos y datos reales.
Mínimo total de palabras: ${targetWords}.
${systemPrompt}`;

            const shortScripts = scriptsArray.filter(s => countScriptWords(s) < minWords);
            const expandedResults = await Promise.all(
                shortScripts.map(s => generateFn({
                    apiKey: process.env.ANTHROPIC_API_KEY,
                    systemPrompt: expandPrompt,
                    userMessage: `EXPANDE este guion manteniendo la misma idea:\nGANCHO: ${s.gancho}\nDESARROLLO: ${(s.desarrollo || []).join(' | ')}\nCTA: ${s.cta}`,
                }))
            );

            // Replace short scripts with expanded ones
            let expandIdx = 0;
            scriptsArray = scriptsArray.map(s => {
                if (countScriptWords(s) < minWords && expandIdx < expandedResults.length) {
                    const expanded = expandedResults[expandIdx++]?.parsed;
                    const expandedScript = Array.isArray(expanded) ? expanded[0] : expanded;
                    return expandedScript || s;
                }
                return s;
            });
        }

        // ── CTA QUALITY CHECK & FIX ──────────────────────
        const WEAK_CTAs = ['sígueme', 'sigueme', 'suscríbete', 'suscribete', 'dale like', 'comenta abajo'];
        scriptsArray = scriptsArray.map(s => {
            if (!s.cta || s.cta.trim().length < 10) {
                s.cta = `Comenta "${topic.split(' ')[0].toUpperCase()}" y te mando más info directamente 👇`;
            }
            const ctaLower = s.cta.toLowerCase();
            if (WEAK_CTAs.some(w => ctaLower === w || ctaLower.trim() === w)) {
                s.cta = `Guarda este video y compártelo con alguien que lo necesite ahora mismo 🔁`;
            }
            return s;
        });

        // Ensure all scripts have required fields
        scriptsArray = scriptsArray.map(s => ({
            ...s,
            titulo_guion: s.titulo_guion || 'Guion Generado',
            video_duration: s.video_duration || videoDuration,
            gancho: s.gancho || '',
            desarrollo: Array.isArray(s.desarrollo) ? s.desarrollo : [s.desarrollo || ''],
            cierre: s.cierre || '',
            cta: s.cta || '',
        }));

        console.log(`[generate-scripts] Returning ${scriptsArray.length} scripts for "${topic}" (${videoDuration})`);
        return NextResponse.json({ scripts: scriptsArray });

    } catch (err) {
        console.error('[generate-scripts] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
