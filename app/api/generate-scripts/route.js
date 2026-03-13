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

    // Map textual Spanish numbers to digits
    const numMap = {
        'un': 1, 'uno': 1, 'una': 1,
        'dos': 2,
        'tres': 3,
        'cuatro': 4,
        'cinco': 5,
        'seis': 6,
        'siete': 7,
        'ocho': 8,
        'nueve': 9,
        'diez': 10
    };

    // 1. Look for numeric digits: "5 mejores", "top 10", etc.
    // Enhanced regex to catch more variations and keywords
    const keywords = "(?:herramientas|ia|inteligencias artificiales|pasos|errores|formas|maneras|estrategias|ejemplos|consejos|tips|ideas|claves|puntos|cosas|herramienta|secreto|paso|truco|guías|guias|sitios|plataformas)";

    const digitMatch = combined.match(new RegExp(`(?:top|las|los|mejores|las\\s+(\\d+)\\s+mejores)?\\s*(\\d{1,2})\\s*${keywords}`, 'i'));
    if (digitMatch) {
        const val = parseInt(digitMatch[2] || digitMatch[1]);
        if (val > 0) return val;
    }

    // 2. Look for textual numbers: "cinco mejores", "tres pasos"
    const textNumPattern = Object.keys(numMap).join('|');
    const textMatch = combined.match(new RegExp(`(?:las|los|mejores|top)?\\s*(${textNumPattern})\\s*${keywords}`, 'i'));
    if (textMatch) {
        return numMap[textMatch[1]];
    }

    // 3. Pattern: 1) Tool 2) Tool ... (Sequential listing)
    const listMatches = combined.match(/\d\s*[\)\.]\s*[A-Za-z]/g);
    if (listMatches && listMatches.length > 1) return listMatches.length;

    // 4. Fallback: Just any number near "mejores" or in title if it looks like a list
    const fallbackMatch = combined.match(/(\d{1,2})\s+(?:mejores|items|puntos|cosas|herramientas|ia|inteligencias artificiales)/i);
    if (fallbackMatch) return parseInt(fallbackMatch[1]);

    return null;
}

// Helper to safely parse JSON arrays even with junk
function extractJSONArray(text) {
    try {
        const match = text.match(/\[\s*[\s\S]*\s*\]/);
        if (match) return JSON.parse(match[0]);
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
}

function parseUserItemList(specificDetails) {
    if (!specificDetails) return [];
    // Detect numbered list: "1) ...", "1. ...", "1: ..."
    const lines = specificDetails.split(/[\n;]+/).map(l => l.trim()).filter(Boolean);
    const items = [];
    for (const line of lines) {
        const match = line.match(/^(\d+)\s*[\.\)\:]\s*(.+)/);
        if (match) {
            items.push({ num: parseInt(match[1]), text: match[2].trim() });
        }
    }
    if (items.length >= 2) return items.map(i => i.text);
    // Fallback: any non-empty line that looks like a tool/step name
    return lines.filter(l => l.length > 3 && !/^[\d\s\-\.\)\#]+$/.test(l)).slice(0, 10);
}

function buildListConstraints(parsedItems, requestedCount) {
    if (!parsedItems || parsedItems.length === 0) return '';
    const total = requestedCount || parsedItems.length;
    const itemsBlock = parsedItems.slice(0, total).map((item, i) => `  ${i + 1}. ${item}`).join('\n');
    return `
╔══════════════════════════════════════════════════════════╗
║           ⚠️  LISTA OBLIGATORIA - LEE CON ATENCIÓN  ⚠️          ║
╠══════════════════════════════════════════════════════════╣
║ El usuario ha proporcionado una lista EXACTA de ${total} puntos. ║
║ DEBES generar EXACTAMENTE ${total} bloques de desarrollo.         ║
║ REGLAS INVIOLABLES:                                      ║
║ • Usa EXACTAMENTE los puntos en el MISMO ORDEN abajo.    ║
║ • NO inventes puntos nuevos.                             ║
║ • NO omitas ninguno de la lista.                         ║
║ • NO repitas ningún punto.                               ║
║ • Cada bloque habla de UNO solo de estos items.          ║
╚══════════════════════════════════════════════════════════╝

LISTA DEL USUARIO (respetar orden exacto):
${itemsBlock}

Para CADA item de la lista, escribe un bloque de desarrollo que:
- Empiece con el nombre exacto del item (ej: "WRITI IA:", "Claude:")
- Explique brevemente qué hace y cómo ayuda al emprendedor
- Use un ejemplo o dato concreto
`;
}

function buildSystemPrompt({ brandContextString, videoDuration, platform, tone, intensity, count, specificDetails, requestedCount, topic, ctaIdea, experienciaReal, opinionPersonal, faseCreador }) {
    const parsedItems = parseUserItemList(specificDetails);
    const totalItems = requestedCount || (parsedItems.length > 0 ? parsedItems.length : null);

    // Prompt context enrichment
    const contextLines = [];
    if (experienciaReal) contextLines.push(`- EXPERIENCIA REAL / HISTORIA: ${experienciaReal}`);
    if (opinionPersonal) contextLines.push(`- OPINIÓN PERSONAL / MENSAJE: ${opinionPersonal}`);
    if (faseCreador) contextLines.push(`- FASE DEL CREADOR: ${faseCreador}`);

    const duracionRules = videoDuration === '30 seg' || videoDuration === '60 seg'
        ? `- DURACIÓN: ${videoDuration} → UN gancho potente, ${totalItems || 3} puntos de desarrollo (1-2 frases cada uno), CTA rápido.`
        : videoDuration === '90 seg' || videoDuration === '2 min'
            ? `- DURACIÓN: ${videoDuration} → Gancho, ${totalItems || 5} bloques de desarrollo (2-3 frases c/u), cierre emocional, CTA.`
            : `- DURACIÓN: ${videoDuration} (YouTube largo) → Intro, ${totalItems || 6} bloques extensos (ejemplos reales), Conclusión, CTA.`;

    const listConstraints = buildListConstraints(parsedItems, totalItems);

    return `ROL:
Eres guionista y estratega de contenido especializado en vídeos cortos y largos para creadores de marca personal. Tu objetivo es escribir guiones que suenen a PERSONA REAL, huyendo de los clichés motivacionales de la IA.

CONTEXTO DEL CREADOR Y NEGOCIO:
${brandContextString}
${contextLines.join('\n')}

INSTRUCCIONES DE ESTILO (CRÍTICAS):
1) HUMANIDAD: El guion debe sonar como una conversación real. PROHIBIDO usar frases como "En este valioso contenido...", "No te pierdas esta oportunidad..." o "¿Alguna vez has soñado con...?".
2) SIN INVENTOS: NO inventes logros ni datos que no estén en el contexto. Si el creador dice que está "empezando", actúa como tal.
3) STORYTELLING: Integra la "Experiencia Real" proporcionada como el corazón del guion (en la sección de HISTORIA).
4) OPINIÓN: Refleja la "Opinión Personal" con firmeza. El contenido debe tener un ángulo propio, no ser neutro.
5) RITMO: Frases simples y fuertes. Evita párrafos de relleno.

ESTRUCTURA DEL GUION:
1. HOOK (1-2 frases): Directo al problema o promesa. Impactante (intensidad ${intensity}/5).
2. CONTEXTO (2-3 frases): Quién eres y por qué esto importa ahora (basado en fase_creador).
3. HISTORIA/CASO REAL: Narración de lo que pasó (basado en experiencia_real).
4. LECCIÓN/OPINIÓN: La idea principal (basada en opinion_personal).
5. CIERRE + CTA: Acción clara alineada con el objetivo.

REGLAS ESPECÍFICAS DE FORMATO:
- PLATAFORMA: ${platform}
- TONO: ${tone}
${duracionRules}
${listConstraints}

${ctaIdea ? `CTA OBLIGATORIO: El usuario quiere que pidas esto: "${ctaIdea}"` : ''}

GENERA EXACTAMENTE ${count} GUION${count > 1 ? 'ES' : ''} DISTINTOS.
RESPONDE ÚNICAMENTE con un JSON array válido:
[
  {
    "titulo_guion": "Título",
    "video_duration": "${videoDuration}",
    "gancho": "Hook directo",
    "desarrollo": ["Punto 1 con historia", "Punto 2 con opinión", "..."],
    "cierre": "Cierre humano",
    "cta": "Llamada a la acción",
    "copy_post": {
      "titulo": "Título post",
      "descripcion_larga": "Caption persuasiva",
      "hashtags": ["#tag1", "..."]
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
            count, videoDuration, specificDetails, victory, opinion, story, awareness, ctaIdea, projectId,
            experienciaReal, opinionPersonal, faseCreador
        } = validation.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Credit Check & Charge (Dynamic Cost)
        const totalCost = getScriptCost(videoDuration, count || 1);
        const creditResult = await chargeCredits(supabase, userId, totalCost, 'generate_scripts', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Fetch Brand Brain: project-scoped first, fallback to global
        let brandBrain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();
            brandBrain = data;
        }

        if (!brandBrain) {
            return NextResponse.json({ error: 'Falta configuración de Cerebro IA (Paso 1).' }, { status: 400 });
        }

        // Rich brand context including personal details
        let brandContextString = `[CONTEXTO BASE DEL CREADOR]
- Bio: ${brandBrain.biography || ''}
- Estilo: ${brandBrain.style_words || ''}
- Tono de marca: ${brandBrain.values_tone || ''}
- Audiencia: ${brandBrain.audience || ''}`;

        // Keep legacy fields for backward compatibility if they aren't provided in the new fields
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
            count: finalCount, specificDetails, requestedCount, topic, ctaIdea,
            experienciaReal, opinionPersonal, faseCreador
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

                    // Try to identify which tools/items are missing if user gave any hints
                    const userLines = specificDetails ? specificDetails.split(/[\n,;]+/).map(l => l.trim()).filter(l => l.length > 3) : [];
                    const missingContext = userLines.length > 0
                        ? `\nLAS ÚLTIMAS ${missing} COSAS QUE EL USUARIO PIDIÓ SON:\n${userLines.slice(-missing).join('\n')}`
                        : "";

                    const expansionPrompt = `El usuario pidió una lista de ${requestedCount} elementos, pero solo generaste ${currentItems.length}.
Genera EXACTAMENTE ${missing} puntos de desarrollo adicionales (puntos ${currentItems.length + 1} a ${requestedCount}).
REGLA CRÍTICA: Si el usuario listó herramientas o puntos concretos, DEBES inclurlos.${missingContext}
Responde SOLO con un JSON array de strings: ["Punto extra 1", "Punto extra 2", ...]`;

                    const { parsed: rawExtra } = await generateFn({
                        apiKey: process.env.ANTHROPIC_API_KEY,
                        systemPrompt: expansionPrompt,
                        userMessage: `Genera los ${missing} puntos faltantes para este guion: ${s.titulo_guion}. Responde SOLO con el JSON array.`,
                    });

                    // Hardened parsing
                    let extraPoints = Array.isArray(rawExtra) ? rawExtra : extractJSONArray(rawExtra);

                    if (!Array.isArray(extraPoints) && typeof rawExtra === 'string') {
                        extraPoints = extractJSONArray(rawExtra);
                    }

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
