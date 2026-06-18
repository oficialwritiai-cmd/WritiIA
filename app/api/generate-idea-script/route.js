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
        return `PLATAFORMA: YouTube (${duration || '5-8 min'}).
ESTRUCTURA OBLIGATORIA — exactamente 5 bloques:
1. INTRO (30s): Presenta el problema concreto que resuelve el vídeo. Di exactamente lo que van a aprender. Engancha con una pregunta o dato impactante.
2. CONTEXTO (1-2 min): Explica por qué este tema importa AHORA. Usa un ejemplo o historia real. 3-4 frases con detalle específico.
3. DESARROLLO PRINCIPAL (2-3 min): El núcleo del valor. Divide en 2-3 sub-puntos con ejemplos reales, cifras o pasos concretos. Cada sub-punto = 2-3 frases.
4. CASO PRÁCTICO o DEMOSTRACIÓN (1-2 min): Muestra cómo aplicarlo en la práctica. Un caso real o ejercicio concreto que el espectador pueda hacer.
5. CIERRE + CTA (30s): Resumen de 1 frase, lección clave, llamada a acción clara (suscribir, comentar, siguiente vídeo).
- Tono: educativo, profundo, con autoridad pero accesible.`;
    }
    if (p.includes('linkedin')) {
        return `PLATAFORMA: LinkedIn (${duration || '2-3 min'}).
ESTRUCTURA — 4 bloques precisos:
1. HOOK PROFESIONAL: Dato o insight que sorprenda al sector. Una sola frase poderosa.
2. EL PROBLEMA REAL: Qué está fallando en el sector/empresa. 2-3 frases con contexto específico.
3. LA SOLUCIÓN CON ROI: Cómo resolverlo con métricas claras. Ejemplo real de resultado. 3-4 frases.
4. LECCIÓN Y CTA: La lección concreta que se llevan + invitar a conectar o comentar perspectiva.
- Tono: profesional, directo, orientado a resultados tangibles.`;
    }
    if (p.includes('tiktok')) {
        return `PLATAFORMA: TikTok (${duration || '45-60 seg'}).
ESTRUCTURA — 3 bloques veloces:
1. HOOK BRUTAL (0-5s): Las primeras palabras deben generar shock, curiosidad o polémica. Sin intro ni presentación. Directo al grano.
2. DESARROLLO RÁPIDO (5-45s): 2 puntos concretos con ejemplo específico o número real cada uno. 2 frases por punto, no más.
3. REMATE + CTA (45-60s): Una frase que deje pensando + "Sígueme para más como esto" o pregunta al comentario.
- Lenguaje: coloquial, energético, como hablar con un amigo.`;
    }
    // Default: Reels / Instagram
    return `PLATAFORMA: Instagram Reels (${duration || '60-90 seg'}).
ESTRUCTURA — 4 bloques bien construidos:
1. HOOK (0-5s): Afirmación polémica, pregunta que duela o dato que sorprenda. UNA sola frase poderosa. Sin presentación.
2. DESARROLLO A (5-30s): El primer punto clave. 3 frases: qué es, por qué importa, ejemplo concreto con detalle real.
3. DESARROLLO B (30-60s): El segundo punto clave o la solución. 3 frases: cómo aplicarlo, qué resultado da, historia o dato específico.
4. CIERRE + CTA (60-90s): La lección de 1 frase + "Guárdalo para cuando lo necesites" o pregunta para comentario.
- Tono: cercano, directo, como un consejo de alguien que ya lo vivió.`;
}

function getMaxTokens(platform) {
    const p = (platform || '').toLowerCase();
    if (p.includes('youtube') && !p.includes('short')) return 2800; // vídeo largo, mucho contenido
    if (p.includes('linkedin')) return 2000;
    return 1800; // Reels, TikTok, Shorts — guión completo con desarrollo rico
}

// Llamada a Anthropic con reintentos ante rate-limit (429) o sobrecarga (529).
// Crítico para escala: muchos usuarios generando a la vez sin que falle.
async function callAnthropicWithRetry({ model, max_tokens, temperature, system, messages, maxRetries = 2 }) {
    let lastErr = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({ model, max_tokens, temperature, system, messages }),
        });

        if (res.ok) {
            const data = await res.json();
            return { ok: true, text: data.content?.[0]?.text || '' };
        }

        const err = await res.json().catch(() => ({}));
        lastErr = err?.error?.message || `HTTP ${res.status}`;

        // Reintentar solo en rate-limit (429) o sobrecarga (529)
        if (res.status === 429 || res.status === 529) {
            // Backoff exponencial: 2s, 4s
            const waitMs = Math.min(2000 * Math.pow(2, attempt), 4000);
            await new Promise(r => setTimeout(r, waitMs));
            continue;
        }
        // Otros errores: no reintentar
        return { ok: false, error: lastErr, status: res.status };
    }
    return { ok: false, error: lastErr || 'Rate limit persistente', status: 429 };
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

════════════════════
HOOK — REGLAS ESTRICTAS
════════════════════
NUNCA hagas esto:
❌ Repetir el título como pregunta
❌ "[título] — y la mayoría lo hace al revés"
❌ Empezar con "¿Sabías que..."
❌ 'Hoy te enseño', 'En este video'

SIEMPRE haz esto:
✅ Hook que provoca dolor o curiosidad real
✅ Máximo 2 frases contundentes
✅ Completamente diferente al título
✅ ESPECÍFICO para: ${brain.niche || 'el sector del creador'} — nunca una frase que valga para cualquier nicho

════════════════════
DESARROLLO — REGLAS ESTRICTAS
════════════════════
NUNCA hagas esto:
❌ "La mayoría no sabe cómo aplicar [título]"
❌ "El coste real está en [título]"
❌ Bloques con solo [HUECOS] sin contenido
❌ 'Con este sistema puedes...', 'Empieza hoy mismo'

SIEMPRE haz esto:
✅ Contenido específico y real en cada bloque
✅ El hueco COMPLETA el contenido, no LO REEMPLAZA
✅ Ejemplo correcto:
   "Los vendedores pierden el 40% de leads por no responder en las primeras 2 horas.
   En tu caso específico [HUECO: añade tu tiempo de respuesta aquí]"

CTAs PROHIBIDOS:
❌ 'Guarda este video y compártelo', 'Sígueme para más contenido'

════════════════════
LONGITUD POR PLATAFORMA
════════════════════
Reels/TikTok (80-90 seg):
→ 150-200 palabras de contenido real
→ Hook: 1-2 frases
→ 3 bloques de 2-3 frases cada uno
→ CTA: 1-2 frases específicas

YouTube (8-15 min):
→ 1.200-2.000 palabras
→ Intro + 5 puntos desarrollados + cierre

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
        const { idea_title, idea_description, platform, projectId, videoDuration, ctaIdea, styleInstruction } = body;

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
${styleInstruction ? `\nESTILO SOLICITADO POR EL USUARIO (prioritario): ${styleInstruction}\nAdapta TODO el guión a este estilo manteniendo la calidad y estructura.` : ''}
Recuerda: el guión debe ser EXTENSO, con bloques bien desarrollados. No generes contenido corto o genérico.`;

        const aiResult = await callAnthropicWithRetry({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: getMaxTokens(platform),
            temperature: 0.8,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
        });

        if (!aiResult.ok) {
            const isRateLimit = aiResult.status === 429 || aiResult.status === 529;
            return NextResponse.json(
                { error: isRateLimit ? 'Servicio saturado, reintenta en unos segundos.' : (aiResult.error || 'Error de IA.'), code: isRateLimit ? 'RATE_LIMIT' : 'AI_ERROR' },
                { status: aiResult.status || 503 }
            );
        }

        let script = extractJson(aiResult.text);

        // Fallback si la IA no devuelve JSON válido — marcado claramente como
        // incompleto (huecos reales) en vez de simular un guion genérico ya
        // "terminado" que violaría las mismas reglas que le exigimos a la IA.
        if (!script?.hook || !script?.structure?.length) {
            script = {
                title: idea_title,
                hook: `[HUECO: escribe aquí un hook específico para "${idea_title}" — la IA no pudo generarlo, reintenta o complétalo a mano]`,
                structure: [
                    { point: 'El problema real', detail: `[HUECO: describe el problema concreto de tu audiencia con "${idea_title}" — con un número o ejemplo real]` },
                    { point: 'Lo que funciona', detail: `[HUECO: tu método específico para resolverlo]. Resultado concreto: [HUECO: tus números aquí].` },
                    { point: 'Cómo aplicarlo ahora', detail: `[HUECO: el primer paso concreto que debe dar el espectador esta semana]` },
                ],
                cta: ctaIdea || `[HUECO: tu llamada a la acción específica]`,
                post_copy: { headline: idea_title, body: `[HUECO: descripción del post para "${idea_title}"]`, hashtags: ['contenido', 'negocio', 'estrategia'] },
                notes: 'GUION DE EMERGENCIA — la IA no devolvió un JSON válido. Pulsa "Regenerar" para reintentar o completa los huecos a mano.'
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
