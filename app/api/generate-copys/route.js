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
            brandContextString = `
- negocio: ${brandBrain.biography || 'No especificada'}
- publico_objetivo: ${brandBrain.target_audience || 'No especificado'}
- tono: ${brandBrain.style_words || 'Profesional y cercano'}
`;
        }

        // Checklist filter
        const wantsTitulos = sections?.titulos !== false;
        const wantsGanchos = sections?.ganchos !== false;
        const wantsDescripciones = sections?.descripciones !== false;
        const wantsHashtags = sections?.hashtags !== false;
        const wantsYoutubeTags = sections?.youtubeTags === true;

        const systemPrompt = `PROMPT INTERNO – COPYS Y GANCHOS (NO MOSTRAR AL USUARIO)
        
Rol de la IA:
Eres un copywriter y estratega de marketing digital de nivel senior.

idioma: ESPAÑOL (Responde SIEMPRE en español).

REGLA DE ORO (FIDELIDAD TOTAL AL TEMA):
- TU RESPUESTA DEBE BASARSE EXCLUSIVAMENTE EN EL "TEMA/IDEA/GUION" PROPORCIONADO POR EL USUARIO.
- NO INVENTES RESULTADOS: Si el usuario dice "estoy creando", "estoy empezando" o "mi proceso", los copys deben ser sobre el PROCESO, no sobre haber alcanzado ya el éxito.
- NO INVENTES DATOS: Queda terminantemente prohibido inventar estadísticas, número de clientes o hitos no mencionados explícitamente.
- SI EL USUARIO NO DA DETALLES: Mantén los copys enfocados en la curiosidad y el valor del tema propuesto, sin rellenar huecos con información falsa.

Contexto:
${brandContextString}
- plataforma: ${platform}
- objetivo: ${goal || 'Engagement'}

Objetivo:
Crear los mejores títulos, ganchos y copys que reflejen FIELMENTE la idea del usuario pero con un ángulo persuasivo de nivel experto.

Reglas para la respuesta:
1) Respóndeme EXCLUSIVAMENTE en JSON válido.
2) Mantén esta estructura EXACTA:

{
  ${wantsTitulos ? '"titles": ["Título 1...", "Título 2...", "Título 3...", "Título 4...", "Título 5..."],' : ''}
  ${wantsDescripciones ? '"descriptions": ["Descripción/copy principal 1...", "Descripción/copy principal 2...", "Descripción/copy principal 3..."],' : ''}
  ${wantsGanchos ? '"hooks": ["Hook 1...", "Hook 2...", "Hook 3...", "Hook 4...", "Hook 5..."],' : ''}
  ${wantsHashtags ? '"hashtags_groups": [["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"], ["#tag6", "#tag7", "#tag8", "#tag9", "#tag10"]],' : ''}
  ${wantsYoutubeTags ? '"youtube_tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]' : ''}
}

Guías específicas:
- Títulos: Máx 60 chars. Enfocados en el TEMA REAL.
- Descripciones: 2-4 frases. Fidelidad absoluta a la fase actual del proyecto (proceso vs éxito).
- Hooks: 1 sola frase potente basada en la realidad de la entrada.

REGLA CRÍTICA: Responde SOLO con el objeto JSON puro.`;

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
