import { NextResponse } from 'next/server';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        const ip = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
        }

        const resObj = new NextResponse();
        try {
            const rlKey = buildRateLimitKey(ip, body?.userId);
            await limiter.check(resObj, 5, rlKey); // Max 5 requests per minute
        } catch {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const { text, platform, goal, projectId, sections } = body;

        if (!text || !platform) {
            return NextResponse.json({ error: 'Faltan campos requeridos (text, platform).' }, { status: 400 });
        }

        // ─────────────────────────────────────────────────────────────
        // SECURITY: Verify Session & Project Ownership (v4.9.0)
        // ─────────────────────────────────────────────────────────────
        const { user, supabase } = await getServerSession(request);
        if (!user) return unauthorized();

        if (projectId) {
            const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
            if (!hasAccess) return forbidden('No tienes permiso para acceder a este proyecto.');
        }

        const verifiedUserId = user.id;

        // Credit Check & Charge (1 credit for copy generation)
        const creditResult = await chargeCredits(supabase, verifiedUserId, CREDIT_COSTS.GENERATE_HOOKS_ONLY || 1, 'generate_copys', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Fetch Brand Brain
        let brandBrain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', verifiedUserId).single();
            brandBrain = data;
        }

        let brandContextString = '';
        if (brandBrain) {
            brandContextString = [
                brandBrain.biography         && `Quién es: ${brandBrain.biography}`,
                brandBrain.niche             && `Nicho: ${brandBrain.niche}`,
                brandBrain.sub_niche         && `Sub-nicho: ${brandBrain.sub_niche}`,
                brandBrain.audience          && `Audiencia: ${brandBrain.audience}`,
                brandBrain.products_services && `Oferta: ${brandBrain.products_services}`,
                brandBrain.style_words       && `Estilo y tono: ${brandBrain.style_words}`,
                brandBrain.values_tone       && `Valores: ${brandBrain.values_tone}`,
                brandBrain.learning_notes    && `Aprendizaje acumulado: ${brandBrain.learning_notes}`,
            ].filter(Boolean).join('\n');
        }

        // Checklist filter
        const wantsTitulos = sections?.titulos !== false;
        const wantsGanchos = sections?.ganchos !== false;
        const wantsDescripciones = sections?.descripciones !== false;
        const wantsHashtags = sections?.hashtags !== false;
        const wantsYoutubeTags = sections?.youtubeTags === true;

        const systemPrompt = `Eres el mejor especialista en títulos virales del mundo hispanohablante.

Has analizado los 10.000 títulos con más clicks en YouTube, Instagram y TikTok en español de los últimos 12 meses.

Sabes exactamente qué combinación de palabras hace que alguien haga click antes de pensarlo dos veces.

REGLA ABSOLUTA DE FIDELIDAD:
Cada título debe basarse EXCLUSIVAMENTE en el tema/idea/guión proporcionado.
Nunca inventes datos no mencionados.
Si el usuario no dio un número, no lo pongas.

FECHA HOY: ${new Date().toLocaleDateString('es-ES', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}

CEREBRO IA DEL CREADOR — USA ESTO PARA PERSONALIZAR TODO:
${brandContextString || 'No disponible'}

REGLA: Los títulos y hooks deben ser específicos para el nicho y audiencia del Cerebro IA. NUNCA genéricos.

TEMA: ${text.slice(0, 100)}
PLATAFORMA: ${platform}
OBJETIVO: ${goal || 'Engagement'}

════════════════════
LA CIENCIA DEL TÍTULO VIRAL
════════════════════

Un título viral activa UNO de estos:

😱 SORPRESA
Dato, afirmación o resultado que el lector no esperaba.
Ejemplo patrón: "Lo que descubrí después de [acción] cambió completamente cómo [resultado]"

😤 FRUSTRACIÓN/DOLOR
Nombra exactamente el problema que tienen pero no han verbalizado.
Ejemplo patrón: "Por qué sigues [problema] aunque hagas todo bien"

🔥 URGENCIA
Algo que está cambiando ahora mismo y que no pueden perderse.
Ejemplo patrón: "Esto está cambiando en [nicho] y la mayoría no lo sabe todavía"

🤔 CURIOSIDAD EXTREMA
Crean una pregunta mental que NECESITA respuesta.
Ejemplo patrón: "Lo que el [autoridad] hace diferente y que nunca ha contado públicamente"

💪 ASPIRACIÓN REAL
Muestran el resultado exacto que desean conseguir.
Ejemplo patrón: "Cómo [perfil] pasó de [situación mala] a [resultado concreto] en [tiempo]"

════════════════════
FÓRMULAS GANADORAS
════════════════════

Genera títulos usando estas fórmulas. Una fórmula diferente por título:

F1 — EL NÚMERO ESPECÍFICO:
"[Número] [cosa] que [resultado concreto] (y que nadie enseña)"

F2 — EL SECRETO REVELADO:
"Lo que [autoridad/experto] hace para [resultado] y por qué no lo habla"

F3 — LA TRANSFORMACIÓN:
"De [situación mala real] a [resultado concreto] en [tiempo] sin [objeción]"

F4 — EL ERROR COSTOSO:
"El error que comete el [%] de [nicho] y que les impide [resultado]"

F5 — LA PREGUNTA QUE DUELE:
"¿Por qué [acción que hacen] no te está generando [resultado que quieren]?"

F6 — EL CONTRAINTUITIVO:
"Por qué [acción común] en realidad está [consecuencia negativa inesperada]"

F7 — LA COMPARACIÓN:
"[Nicho] que [resultado malo] vs [nicho] que [resultado bueno]: la única diferencia"

F8 — LA URGENCIA TEMPORAL:
"Esto está cambiando en [nicho] [año actual]: lo que necesitas saber"

════════════════════
REGLAS DE CALIDAD
════════════════════

CADA TÍTULO DEBE:
✅ Funcionar en thumbnail de YouTube (legible en miniatura de 3cm)
✅ Generar curiosidad sin revelar todo
✅ Ser específico para ESTE nicho
✅ Tener máximo 70 caracteres
✅ Activar UNA emoción dominante
✅ No empezar con el nombre de la marca

NUNCA:
❌ Títulos que empiecen con la marca
❌ Adjetivos vacíos: increíble, revolucionario
❌ Promesas no relacionadas con el tema
❌ Más de 70 caracteres
❌ Títulos que valgan para cualquier nicho

PRUEBA FINAL:
¿Harías click en esto a las 11pm cuando estás cansado y con el móvil?
Si la respuesta es no — reescríbelo.

Formato de respuesta:
Respóndeme EXCLUSIVAMENTE en JSON válido con esta estructura EXACTA:

{
  ${wantsTitulos ? '"titles": ["Título 1...", "Título 2...", "Título 3...", "Título 4...", "Título 5..."],' : ''}
  ${wantsDescripciones ? '"descriptions": ["Descripción 1...", "Descripción 2...", "Descripción 3..."],' : ''}
  ${wantsGanchos ? '"hooks": ["Primera frase completa lista para grabar — específica para el nicho, máximo 20 palabras, sin intro genérica", "...", "...", "...", "..."],' : ''}
  ${wantsHashtags ? '"hashtags_groups": [["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"], ["#tag6", "#tag7", "#tag8", "#tag9", "#tag10"]],' : ''}
  ${wantsYoutubeTags ? '"youtube_tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]' : ''}
}

REGLA CRÍTICA: Responde SOLO con el objeto JSON puro, sin explicaciones.`;

        const userMessage = `
ENTRADA DEL USUARIO (IDEA/GUION):
"""
${text}
"""

Plataforma: ${platform}
Objetivo: ${goal || 'Engagement'}

Por favor, genera el JSON siguiendo las instrucciones del prompt interno.`;

        let result = null;
        let rawContent = '';
        try {
            const haikuRes = await generateIdeasWithHaiku({
                apiKey: process.env.ANTHROPIC_API_KEY,
                systemPrompt,
                userMessage,
            });
            rawContent = haikuRes.content || '';
            
            const extractJSON = (text) => {
                try {
                    const firstBrace = text.indexOf('{');
                    const lastBrace = text.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        const jsonStr = text.substring(firstBrace, lastBrace + 1);
                        return JSON.parse(jsonStr);
                    }
                } catch (e) {}
                return null;
            };

            result = extractJSON(rawContent);

            if (!result && haikuRes.parsed) {
                result = Array.isArray(haikuRes.parsed) ? haikuRes.parsed[0] : haikuRes.parsed;
            }

        } catch (genErr) {
            console.error('[generate-copys] Gen Error:', genErr);
            return NextResponse.json({ error: 'La IA no pudo procesar la solicitud. Por favor intenta de nuevo.' }, { status: 500 });
        }

        if (!result) {
            return NextResponse.json({ error: 'La IA devolvió un formato vacío o ilegible. Reintenta por favor.' }, { status: 500 });
        }

        const deepResult = result.result || result.data || result.content || result;

        const normalized = {
            titles: deepResult.titles || deepResult.titulos || (deepResult.titulo_angulo ? [deepResult.titulo_angulo] : []),
            hooks: deepResult.hooks || deepResult.ganchos || (deepResult.gancho ? [deepResult.gancho] : []),
            descriptions: deepResult.descriptions || deepResult.descripciones || (Array.isArray(deepResult.desarrollo) ? deepResult.desarrollo : (deepResult.desarrollo ? [deepResult.desarrollo] : [])),
            hashtags_groups: deepResult.hashtags_groups || deepResult.hashtags || [],
            youtube_tags: deepResult.youtube_tags || deepResult.youtubeTags || []
        };

        const cleanList = (list) => {
            if (!Array.isArray(list)) return [];
            return list.map(item => String(item).trim()).filter(i => i && i.length > 3 && !i.startsWith('{'));
        };

        normalized.titles = cleanList(normalized.titles);
        normalized.hooks = cleanList(normalized.hooks);
        normalized.descriptions = cleanList(normalized.descriptions);
        normalized.youtube_tags = cleanList(normalized.youtube_tags);

        // Map hashtags specifically
        normalized.hashtags_groups = Array.isArray(normalized.hashtags_groups) 
            ? normalized.hashtags_groups.map(group => Array.isArray(group) ? group : [group])
            : [];

        if (projectId) {
            await supabase.rpc('increment_project_stat', { p_project_id: projectId, p_column: 'hooks_generated', p_amount: 1 });
        }

        return NextResponse.json({ result: normalized });

    } catch (err) {
        console.error('[generate-copys] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
