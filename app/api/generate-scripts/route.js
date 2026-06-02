import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GenerateScriptSchema } from '@/lib/validations';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { generateScriptsWithSonnet, generateScriptsLong } from '@/lib/anthropic';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';
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
    '10 min': 1700,  // ~170 wpm
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

    // v4.5.5: Si es una narrativa real ("Cómo gané 10k", "Por qué odio 5 cosas", "Cuando..."), ignorar extracción de números
    const isNarrative = /\b(c[oó]mo|por qu[eé]|mi historia|experiencia|storytime|cuando|tutorial|gu[ií]a|chisme|an[é\e]cdota)\b/i.test(combined);
    if (isNarrative) {
        return null;
    }

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

/**
 * Ensures an input is a flat array of strings.
 * If items are objects, it tries to extract common text fields.
 */
function ensureStringArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
        if (typeof item === 'string') return item;
        if (item === null || item === undefined) return '';
        if (typeof item === 'object') {
            // Try common text keys if AI returned objects
            return item.text || item.punto || item.point || item.contenido || JSON.stringify(item);
        }
        return String(item);
    }).filter(s => typeof s === 'string' && s.length > 0);
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

function buildSystemPrompt({ brandContextString, videoDuration, platform, tone, intensity, count, specificDetails, requestedCount, topic, ctaIdea, experienciaReal, opinionPersonal, faseCreador, projectLanguage, targetWords }) {
    const parsedItems = parseUserItemList(specificDetails);
    const totalItems = requestedCount || (parsedItems.length > 0 ? parsedItems.length : null);
    const defaultItemsCount = (videoDuration === '3 min' || videoDuration === '5 min') ? 6 
                            : videoDuration === '10 min' ? 10 
                            : 3;
    const finalItemsCount = totalItems || defaultItemsCount;
    const exampleDesarrollo = Array.from({ length: finalItemsCount }).map((_, i) => `"[PUNTO REAL ${i + 1}]"`).join(', ');

    // Prompt context enrichment
    const contextLines = [];
    if (experienciaReal) contextLines.push(`- EXPERIENCIA REAL / HISTORIA: ${experienciaReal}`);
    if (opinionPersonal) contextLines.push(`- OPINIÓN PERSONAL / MENSAJE: ${opinionPersonal}`);
    if (faseCreador) contextLines.push(`- FASE DEL CREADOR: ${faseCreador}`);

    const duracionRules = videoDuration === '30 seg' || videoDuration === '60 seg'
        ? `- DURACIÓN: ${videoDuration} → UN gancho potente, ${totalItems || 3} puntos de desarrollo (1-2 frases cada uno), CTA rápido.`
        : videoDuration === '90 seg' || videoDuration === '2 min'
            ? `- DURACIÓN: ${videoDuration} → Gancho, ${totalItems || 5} bloques de desarrollo (2-3 frases c/u), cierre emocional, CTA.`
            : videoDuration === '3 min' || videoDuration === '5 min'
                ? `- DURACIÓN: ${videoDuration} (YouTube largo) → Intro narrativa detallada, ${totalItems || 6} bloques MUY EXTENSOS (usa anécdotas completas y ejemplos paso a paso), Conclusión profunda, CTA.`
                : `- DURACIÓN: ${videoDuration} (Formato muy largo/Podcast) → Estructura de Guion de 10 min completo. Intro profunda, ${totalItems || 10} bloques de desarrollo súper detallados con historias, casos reales, transiciones, conclusión y CTA extendido.`;

    const listConstraints = buildListConstraints(parsedItems, totalItems);

    const lengthRule = targetWords ? `\nREGLA DE LONGITUD ESTRICTA: Tu respuesta FINAL debe contener APROXIMADAMENTE ${targetWords} PALABRAS de contenido real (excluyendo formato JSON). Para lograr esto en duraciones largas (3, 5, 10 min), es OBLIGATORIO que los bloques de desarrollo sean MUY EXTENSOS, con descripciones ricas, guiones de actuación, ejemplos reales completos y storytelling. ESTÁ PROHIBIDO RESUMIR.` : '';

    const currentYear = new Date().getFullYear();
    return `Eres el mejor guionista de contenido corto del mundo hispanohablante.

Has estudiado obsesivamente a:
- Alex Hormozi (densidad de valor)
- Gary Vaynerchuk (autenticidad brutal)
- Los coaches que más venden en Instagram
- Los creadores con más retención en TikTok
- Los comunicadores que generan acción real

Tu especialidad: escribir guiones que hacen que la gente PARE, SIENTA y ACTÚE.
No informas. No explicas. IMPACTAS.

FECHA HOY: ${new Date().toLocaleDateString('es-ES', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}
Toda referencia temporal usa esta fecha.
Nada de 2024 o anterior como actual.

CEREBRO IA DEL CREADOR:
${brandContextString}
${contextLines.join('\n')}

TEMA: ${specificDetails || topic}
PLATAFORMA: ${platform}
DURACIÓN: ${videoDuration}

════════════════════
ARQUITECTURA DEL GUIÓN
════════════════════

## GANCHO — Los 3 segundos que lo deciden todo

REGLAS DE ORO DEL GANCHO:
- Debe provocar UNA de estas reacciones:
  'Espera, ¿qué?' / 'Eso me pasa a mí' /
  'No puede ser verdad' / 'Necesito saber más'
- NUNCA empieza con: 'Hoy', 'En este video',
  'Quiero hablar de', 'Voy a enseñarte'
- SÍ empieza con: pregunta que duele,
  afirmación que provoca, dato que sorprende,
  confesión que conecta, paradoja que intriga
- Máximo 2 frases. Cada palabra gana su lugar.
- Debe funcionar sin imagen, solo con audio.

TIPOS DE GANCHO — elige el más poderoso:
- DOLOR: Nombra el problema exacto que tienen antes de que ellos lo digan
- CONTRAINTUITIVO: Di lo opuesto a lo esperado
- CIFRA ESPECÍFICA: Un número que sorprende
- CONFESIÓN: Algo vulnerable y real
- PROMESA IMPOSIBLE: Que luego cumples

## DESARROLLO — Donde ganas la confianza

${finalItemsCount} puntos máximo. Cada uno sigue esta estructura:
1. AFIRMACIÓN bold que resume el punto
2. HISTORIA o EJEMPLO concreto y específico [HUECO: añade aquí tu historia personal]
3. INSIGHT que solo alguien que lo vivió sabe

REGLAS DEL DESARROLLO:
- Cada punto resuelve UNA cosa concreta
- Usa el tono exacto del Cerebro IA
- Habla como si fuera una conversación real
- Incluye imperfecciones — suenan humanas
- Conecta cada punto con el negocio real del creador y su cliente ideal
- Crea tensión emocional que se resuelve en el siguiente punto

## CTA — El cierre que convierte

No es un cierre. Es una invitación.

REGLAS DEL CTA:
- Específico para ESTE guión, no genérico
- Conecta directamente con cómo este contenido llena la agenda del coach
- Una sola acción. Clara. Sin opciones.
- Debe sentirse como el paso natural obvio
- Genera urgencia sin presión falsa
${ctaIdea ? `- ACCIÓN ESPECÍFICA SOLICITADA: "${ctaIdea}"` : ''}

════════════════════
ESTÁNDARES DE CALIDAD
════════════════════

EMOCIÓN DOMINANTE DEL GUIÓN:
Antes de escribir, elige UNA:
[ ] Curiosidad — no pueden parar sin saber el final
[ ] Identificación — 'esto me pasa exactamente'
[ ] Urgencia — necesitan actuar ahora
[ ] Inspiración — creen que pueden lograrlo
[ ] Indignación — algo estaba mal y ahora lo ven

TODO el guión trabaja para esa emoción.
Cada frase la refuerza o la construye.

PRUEBA FINAL — antes de entregar pregúntate:
¿Suena esto a conversación real o a IA?
¿Para el scroll en los primeros 3 segundos?
¿Genera la emoción dominante elegida?
¿El CTA es específico o genérico?

Si alguna respuesta es negativa, reescribe.

Este guión debe ser tan bueno que el creador piense: 'Yo no habría podido escribir esto mejor.'

IDIOMA: ${projectLanguage === 'en' ? 'INGLÉS' : 'ESPAÑOL'}
INTENSIDAD: ${intensity}/5
${duracionRules}

GENERA EXACTAMENTE ${count} GUION${count > 1 ? 'ES' : ''} DISTINTOS.
RESPONDE ÚNICAMENTE con un JSON array válido (sin texto adicional, sin markdown):
[
  {
    "titulo_guion": "Título del guion",
    "video_duration": "${videoDuration}",
    "gancho": "[TEXTO REAL - NO VACÍO]",
    "desarrollo": [${exampleDesarrollo}],
    "cierre": "[TEXTO REAL - NO VACÍO]",
    "cta": "[TEXTO REAL - NO VACÍO]",
    "copy_post": {
      "titulo": "[TEXTO REAL]",
      "descripcion_larga": "[TEXTO REAL - NO VACÍO]",
      "hashtags": ["#tag1", "#tag2"]
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
            console.error('[generate-scripts] Zod validation failed:', JSON.stringify(validation.error.flatten(), null, 2));
            console.error('[generate-scripts] Body received:', JSON.stringify(body, null, 2));
            return NextResponse.json({ error: 'Datos inválidos.', details: validation.error.flatten() }, { status: 400 });
        }

        const {
            topic, platform, tone, userId, hookType, intensity,
            count, videoDuration, specificDetails, victory, opinion, story, awareness, ctaIdea, projectId,
            experienciaReal, opinionPersonal, faseCreador
        } = validation.data;

        const { user, supabase } = await getServerSession(request);
        if (!user) return unauthorized();

        // ─────────────────────────────────────────────────────────────
        // SECURITY: Verify project ownership (v4.9.0)
        // ─────────────────────────────────────────────────────────────
        if (projectId) {
            const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
            if (!hasAccess) return forbidden('No tienes permiso para acceder a este proyecto.');
        }

        // Use verified userId from session, not from body if possible
        const verifiedUserId = user.id;

        // Credit Check & Charge (Dynamic Cost)
        const totalCost = getScriptCost(videoDuration, count || 1);
        const creditResult = await chargeCredits(supabase, verifiedUserId, totalCost, 'generate_scripts', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Fetch Brand Brain: project-scoped first, fallback to global
        let brandBrain = null;
        let projectData = null;

        if (projectId) {
            const [brainRes, projectRes] = await Promise.all([
                supabase.from('project_brains').select('*').eq('project_id', projectId).single(),
                supabase.from('projects').select('*').eq('id', projectId).single()
            ]);
            brandBrain = brainRes.data;
            projectData = projectRes.data;
        }

        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', verifiedUserId).single();
            brandBrain = data;
        }

        if (!brandBrain) {
            return NextResponse.json({ error: 'Falta configuración de Cerebro IA (Paso 1).' }, { status: 400 });
        }

        const projectLanguage = projectData?.language || 'es';

        // Rich brand context including personal details. 
        // We truncate large fields to prevent exceeding strict token limits (16384 on some proxies/models)
        let brandContextString = `[CONTEXTO BASE DEL CREADOR]
- Bio: ${(brandBrain.biography || '').substring(0, 1500)}
- Nicho: ${(brandBrain.niche || '').substring(0, 500)}
- Sub-nicho: ${(brandBrain.sub_niche || '').substring(0, 500)}
- Estilo: ${(brandBrain.style_words || '').substring(0, 300)}
- Tono de marca: ${(brandBrain.values_tone || '').substring(0, 300)}
- Audiencia: ${(brandBrain.audience || '').substring(0, 1000)}
- APRENDIZAJE / FEEDBACK ACUMULADO: ${(brandBrain.learning_notes || '').substring(0, 3000)}`;

        // Keep legacy fields for backward compatibility if they aren't provided in the new fields
        if (victory) brandContextString += `\n- Victoria/Fracaso reciente: ${victory.substring(0, 500)}`;
        if (opinion) brandContextString += `\n- Opinión impopular a integrar: ${opinion.substring(0, 500)}`;
        if (story) brandContextString += `\n- Caso real/Historia: ${story.substring(0, 1000)}`;
        if (awareness) brandContextString += `\n- Nivel de awareness de la audiencia: ${awareness.substring(0, 200)}`;

        const requestedCountRaw = extractRequestedCount(topic, specificDetails || "");
        
        // v4.5.4: Cap requestedCount based on duration to prevent [object Object] / truncation
        // 90s/60s/30s videos should NOT have 50 points even if the title says so.
        let requestedCount = requestedCountRaw;
        if (requestedCount > 15 && (videoDuration === '30 seg' || videoDuration === '60 seg' || videoDuration === '90 seg')) {
            console.log(`[generate-scripts] Capping insane requestedCount (${requestedCount} -> 12) for duration ${videoDuration}`);
            requestedCount = 12; 
        } else if (requestedCount > 30 && (videoDuration === '2 min' || videoDuration === '3 min')) {
            requestedCount = 20;
        } else if (requestedCount > 50) {
            requestedCount = 50; // Hard max
        }

        // Pick the right generator based on duration
        const isLongScript = videoDuration === '3 min' || videoDuration === '5 min';
        const generateFn = isLongScript ? generateScriptsLong : generateScriptsWithSonnet;

        const targetWords = WORDS_PER_DURATION[videoDuration] || 140;
        const finalCount = count || 1;

        // ── GENERATION: Parallel Execution ───────────────────
        // Instead of generating 4 long scripts in one 4096-token response (which always truncates and fails),
        // we execute single-script requests in parallel to respect context window limits and avoid truncation.
        
        let scriptsArray = [];
        const baseSystemPrompt = buildSystemPrompt({
            brandContextString, videoDuration, platform, tone, intensity: intensity || 3,
            count: 1, specificDetails, requestedCount, topic, ctaIdea,
            experienciaReal, opinionPersonal, faseCreador, projectLanguage, targetWords
        });

        const userMessage = `Tema central: ${topic}. Tipo de gancho preferido: ${hookType || 'curiosidad extrema'}.`;

        const parallelGenerations = Array.from({ length: finalCount }).map((_, idx) => {
            const variantMsg = idx > 0 
                ? `${userMessage} (IMPORTANTE: Mismo tema, pero usa un ángulo o punto de vista DISTINCTO al convencional. Variante #${idx + 1})`
                : userMessage;
                
            return generateFn({
                apiKey: process.env.ANTHROPIC_API_KEY,
                systemPrompt: baseSystemPrompt,
                userMessage: variantMsg,
            }).catch(err => {
                console.error(`[generate-scripts] Variant #${idx+1} failed:`, err.message);
                return null;
            });
        });

        const results = await Promise.all(parallelGenerations);
        
        // Collect all successfully generated scripts
        results.forEach(res => {
            if (res && res.parsed) {
                const parsedResult = Array.isArray(res.parsed) ? res.parsed[0] : res.parsed;
                if (parsedResult) scriptsArray.push(parsedResult);
            }
        });

        // ── FIX COUNT BUG: if completely failed, try emergency fallback ──
        if (scriptsArray.length === 0) {
            console.error(`[generate-scripts] All parallel requests failed. Executing fallback.`);
            const fallbackResults = await generateFn({
                apiKey: process.env.ANTHROPIC_API_KEY,
                systemPrompt: baseSystemPrompt,
                userMessage: userMessage,
            });
            scriptsArray = Array.isArray(fallbackResults?.parsed) 
                ? fallbackResults.parsed 
                : (fallbackResults?.parsed ? [fallbackResults.parsed] : []);
        }

        // ── LIST COUNT VALIDATION & EXPANSION (Surgical) ─────
        if (requestedCount) {
            scriptsArray = await Promise.all(scriptsArray.map(async (s) => {
                const currentItems = ensureStringArray(s.desarrollo);
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

                    // Hardened parsing with ensureStringArray
                    let extraPoints = Array.isArray(rawExtra) ? rawExtra : extractJSONArray(rawExtra);

                    if (!Array.isArray(extraPoints) && typeof rawExtra === 'string') {
                        extraPoints = extractJSONArray(rawExtra);
                    }

                    if (Array.isArray(extraPoints)) {
                        const validatedExtra = ensureStringArray(extraPoints);
                        s.desarrollo = [...currentItems, ...validatedExtra].slice(0, requestedCount);
                    } else {
                        s.desarrollo = currentItems;
                    }
                } else if (currentItems.length > requestedCount) {
                    s.desarrollo = currentItems.slice(0, requestedCount);
                } else {
                    s.desarrollo = currentItems;
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
${baseSystemPrompt}`;

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
                    if (expandedScript) {
                        expandedScript.desarrollo = ensureStringArray(expandedScript.desarrollo);
                        return expandedScript;
                    }
                }
                s.desarrollo = ensureStringArray(s.desarrollo);
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

        // Ensure all scripts have required fields - v4.5.4: hard content guard
        scriptsArray = scriptsArray.map(s => {
            const hasGancho = s.gancho && typeof s.gancho === 'string' && s.gancho.trim().length > 10;
            const desarrolloArray = ensureStringArray(s.desarrollo);
            const hasDesarrollo = desarrolloArray.length > 0 && desarrolloArray.some(d => d.trim().length > 10);
            const hasCta = s.cta && typeof s.cta === 'string' && s.cta.trim().length > 10;

            // If gancho is empty or is just the title, generate a content-aware fallback
            const ganchoFinal = hasGancho ? s.gancho
                : `Hay algo sobre ${topic} que la mayoría no te cuenta, y hoy lo vamos a cambiar.`;
            
            const ctaFinal = hasCta ? s.cta
                : (ctaIdea || `Comenta "${topic.split(' ')[0].toUpperCase()}" y te envío más información. 👇`);

            const desarrolloFinal = hasDesarrollo ? desarrolloArray
                : [
                    `Un primer punto clave sobre ${topic}: esto cambia la forma en que trabajas si lo aplicas hoy.`,
                    `Segundo punto: la mayoría de creadores y emprendedores cometen este error que les cuesta tiempo y dinero.`,
                    `Tercer punto: la solución práctica que puedes implementar de inmediato sin necesidad de experiencia previa.`
                  ];

            // Safety for copy_post strings
            const copyPost = s.copy_post || {};
            const cleanCopyPost = {
                titulo: typeof copyPost.titulo === 'string' ? copyPost.titulo : (topic || 'Post'),
                descripcion_larga: typeof copyPost.descripcion_larga === 'string' ? copyPost.descripcion_larga : ganchoFinal,
                hashtags: Array.isArray(copyPost.hashtags) ? copyPost.hashtags.map(h => String(h)) : []
            };

            return {
                ...s,
                titulo_guion: (s.titulo_guion && typeof s.titulo_guion === 'string') ? s.titulo_guion : (topic || 'Guion Generado'),
                video_duration: s.video_duration || videoDuration,
                gancho: String(ganchoFinal),
                desarrollo: desarrolloFinal,
                cierre: (s.cierre && typeof s.cierre === 'string' && s.cierre.trim().length > 10) ? s.cierre : `Empieza hoy, no mañana. El momento perfecto no llega solo.`,
                cta: String(ctaFinal),
                copy_post: cleanCopyPost
            };
        });

        // Final v4.5.3 Guard: Ensure we never return an empty array if status is 200
        if (scriptsArray.length === 0) {
            console.error(`[generate-scripts] CRITICAL: scriptsArray is EMPTY after all guards for topic "${topic}". Injecting emergency recovery script.`);
            scriptsArray = [{
                titulo_guion: topic || 'Guion de Recuperación',
                video_duration: videoDuration,
                gancho: `¿Alguna vez te has preguntado cómo dominar ${topic}? Prepárate porque hoy te revelo el secreto mejor guardado.`,
                desarrollo: [
                    `Punto 1: Entiende que ${topic} no es tan difícil como parece si tienes las herramientas adecuadas.`,
                    `Punto 2: La clave está en la consistencia y en aplicar estrategias validadas por expertos en el nicho.`,
                    `Punto 3: Empieza hoy mismo y verás resultados antes de lo que imaginas.`
                ],
                cierre: `No pierdas más tiempo. El éxito en ${topic} está a un clic de distancia.`,
                cta: ctaIdea || `Dame un LIKE si quieres la parte 2 sobre ${topic}. 👇`,
                copy_post: { titulo: topic, descripcion_larga: `Dominando ${topic} paso a paso.`, hashtags: ['ia', 'estrategia', topic.split(' ')[0]] }
            }];
        }

        console.log(`[v4.5.3] Returning ${scriptsArray.length} scripts. Sample Hook: "${scriptsArray[0]?.gancho?.substring(0, 50)}..."`);
        return NextResponse.json({ scripts: scriptsArray });

    } catch (err) {
        console.error('[generate-scripts] Error:', err?.message || err);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
