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
// (150-180 words/min speaking pace, plus wiggle room)
// ─────────────────────────────────────────────
const WORDS_PER_DURATION = {
    '30 seg': 85,    // ~170 wpm
    '60 seg': 170,   // ~170 wpm
    '90 seg': 255,   // ~170 wpm
    '2 min': 340,    // ~170 wpm
    '3 min': 510,    // ~170 wpm
    '5 min': 850,    // ~170 wpm
};

// Minimum acceptable ratio before we trigger an expansion call (Strict)
const MIN_WORD_RATIO = 0.85;

function countScriptWords(script) {
    const parts = [
        script.gancho || '',
        ...(Array.isArray(script.desarrollo) ? script.desarrollo : []),
        script.cierre || '',
        script.cta || '',
    ];
    return parts.join(' ').split(/\s+/).filter(Boolean).length;
}

function extractRequestedCount(topic, details) {
    const combined = `${topic} ${details}`.toLowerCase();

    // Pattern: "5 herramientas", "top 10", "3 pasos"
    const match = combined.match(/(?:top|mejores|las|los)?\s*(\d{1,2})\s*(?:herramientas|ia|pasos|errores|formas|maneras|estrategias|ejemplos|consejos|tips|ideas|claves)/);
    if (match) return parseInt(match[1]);

    // Pattern: 1) Tool 2) Tool ...
    const listMatches = combined.match(/\d\s*[\)\.]\s*[A-Za-z]/g);
    if (listMatches && listMatches.length > 1) return listMatches.length;

    // Fallback: Just "5 mejores"
    const simpleMatch = combined.match(/(\d{1,2})\s+(?:mejores|items|puntos|cosas)/);
    if (simpleMatch) return parseInt(simpleMatch[1]);

    return null;
}

function buildSystemPrompt({ brandContextString, videoDuration, platform, tone, intensity, count, specificDetails, requestedCount }) {
    // Structure rules vary by duration
    const duracionRules = videoDuration === '30 seg' || videoDuration === '60 seg'
        ? `- DURACIÓN: ${videoDuration} → UN solo gancho potente, ${requestedCount || 3} frases de desarrollo detalladas, CTA rápido. Total ~${WORDS_PER_DURATION[videoDuration]} palabras.`
        : videoDuration === '90 seg' || videoDuration === '2 min'
            ? `- DURACIÓN: ${videoDuration} → Gancho, desarrollo ${requestedCount || '4-5'} bloques (cada uno con 2-3 frases), cierre emocional, CTA. Total ~${WORDS_PER_DURATION[videoDuration]} palabras.`
            : `- DURACIÓN: ${videoDuration} (YouTube largo) → Intro, ${requestedCount || '5-7'} bloques de desarrollo extensos (cada uno con ejemplos reales), Conclusión, CTA. Mínimo ${WORDS_PER_DURATION[videoDuration]} palabras.`;

    // Force WRITI IA if mentioned
    let mandatoryTools = "";
    if (specificDetails?.toLowerCase().includes("writi ia")) {
        mandatoryTools = `\n[MANDATO DE MARCA]: "WRITI IA" DEBE ser la herramienta #1. Descríbela como "la mejor del momento para crear contenido viral, guiones y calendario en segundos".`;
    }

    const specificDetailsBlock = specificDetails && specificDetails.trim()
        ? `\nDETALLES ESPECÍFICOS (OBLIGATORIO - PRIORIDAD CRÍTICA):\n${specificDetails.trim()}\n${mandatoryTools}\n` +
        `- Si el usuario listó herramientas o puntos concretos, DEBES incluirlos TODOS en el mismo orden.\n` +
        `- No inventes herramientas ajenas si el usuario ya dio una lista.\n` +
        `- Si el usuario pidió un número específico (${requestedCount || 'N/A'}), genera EXACTAMENTE esa cantidad de ítems de desarrollo.`
        : '';

    return `Eres un estratega de contenido viral Pro. Creas guiones profundos, auténticos y extensos.
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

        const requestedCount = extractRequestedCount(topic, specificDetails || "");

        // Pick the right generator based on duration
        const isLongScript = videoDuration === '3 min' || videoDuration === '5 min';
        const generateFn = isLongScript ? generateScriptsLong : generateScriptsWithSonnet;

        const targetWords = WORDS_PER_DURATION[videoDuration] || 140;
        const finalCount = count || 1;

        const systemPrompt = buildSystemPrompt({
            brandContextString, videoDuration, platform, tone, intensity: intensity || 3,
            count: finalCount, specificDetails, requestedCount
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
                count: missing, specificDetails, requestedCount
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

        // ── LIST COUNT VALIDATION & EXPANSION (Surgical) ─────
        if (requestedCount) {
            scriptsArray = await Promise.all(scriptsArray.map(async (s) => {
                const currentItems = Array.isArray(s.desarrollo) ? s.desarrollo : [s.desarrollo];
                if (currentItems.length < requestedCount) {
                    console.log(`[generate-scripts] List too short (${currentItems.length}/${requestedCount}). Expanding...`);
                    const missing = requestedCount - currentItems.length;

                    // Try to identify which tools are missing if user gave a list
                    const userList = specificDetails ? specificDetails.split('\n').filter(l => /^\d+[\)\.]/.test(l.trim())) : [];
                    const missingContext = userList.length > 0 ? `\nHERRAMIENTAS SOLICITADAS QUE FALTAN:\n${userList.slice(currentItems.length).join('\n')}` : "";

                    const expansionPrompt = `El usuario pidió una lista de ${requestedCount} elementos, pero solo generaste ${currentItems.length}.
Genera EXACTAMENTE ${missing} puntos de desarrollo adicionales.
REGLA CRÍTICA: Si el usuario listó herramientas específicas en los detalles, USA ESAS HERRAMIENTAS.${missingContext}
Responde SOLO con un JSON array de strings con los puntos faltantes: ["Punto extra 1", "Punto extra 2", ...]`;

                    const { parsed: extraPoints } = await generateFn({
                        apiKey: process.env.ANTHROPIC_API_KEY,
                        systemPrompt: expansionPrompt,
                        userMessage: `Genera los ${missing} puntos faltantes para este guion: ${s.titulo_guion}`,
                    });

                    if (Array.isArray(extraPoints)) {
                        s.desarrollo = [...currentItems, ...extraPoints].slice(0, requestedCount);
                    }
                } else if (currentItems.length > requestedCount) {
                    s.desarrollo = currentItems.slice(0, requestedCount);
                }
                return s;
            }));
        }

        // ── WORD COUNT VALIDATION: expand short scripts ──────
        const minWords = Math.floor(targetWords * MIN_WORD_RATIO);
        const needsWordExpansion = scriptsArray.some(s => countScriptWords(s) < minWords);

        if (needsWordExpansion) {
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
