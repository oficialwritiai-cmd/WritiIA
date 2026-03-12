import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
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

        const { text, platform, goal, userId, projectId, sections } = body;

        if (!text || !platform || !userId) {
            return NextResponse.json({ error: 'Faltan campos requeridos (text, platform, userId).' }, { status: 400 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // Credit Check & Charge (1 credit for copy generation)
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.GENERATE_HOOKS_ONLY || 1, 'generate_copys', projectId);
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
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();
            brandBrain = data;
        }

        let brandContextString = '';
        if (brandBrain) {
            brandContextString = `\n--- IDENTIDAD DE MARCA (CEREBRO IA) ---\nBiografía: ${brandBrain.biography || 'No especificada'}\nEstilo/Tono: ${brandBrain.style_words || 'No especificado'}\n---------------------------------------\nTodo el texto generado debe estar alineado a esta identidad.`;
        }

        // Checklist filter
        const wantsTitulos = sections?.titulos !== false;
        const wantsGanchos = sections?.ganchos !== false;
        const wantsDescripciones = sections?.descripciones !== false;
        const wantsHashtags = sections?.hashtags !== false;
        const wantsYoutubeTags = sections?.youtubeTags === true;

        const systemPrompt = `Eres un copywriter experto en redes sociales.
${brandContextString}

Tu objetivo es generar variaciones de TÍTULOS, GANCHOS (Hooks), DESCRIPCIONES (Copys) y HASHTAGS a partir de un texto base o guion proporcionado por el usuario.

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura ESTRICTA. No incluyas markdown, saludos ni explicaciones, solo el JSON puro.
{
  ${wantsTitulos ? '"titulos": ["título 1", "título 2", "título 3", "título 4", "título 5"],' : ''}
  ${wantsGanchos ? '"ganchos": ["gancho 1", "gancho 2", "gancho 3", "gancho 4", "gancho 5"],' : ''}
  ${wantsDescripciones ? '"descripciones": ["descripción larga 1", "descripción larga 2", "descripción larga 3"],' : ''}
  ${wantsHashtags ? '"hashtags": [["#hash1", "#hash2", "#hash3"], ["#tag1", "#tag2", "#tag3"]],' : ''}
  ${wantsYoutubeTags ? '"youtubeTags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"]' : ''}
}
(Asegúrate de que el JSON no tenga comas sobrantes al final si omites campos).

REGLAS ESTRICTAS:
${wantsTitulos ? '- DEBES generar EXACTAMENTE 5 "titulos" ultra-llamativos y cortos.' : ''}
${wantsGanchos ? '- DEBES generar EXACTAMENTE 5 "ganchos" que capten la atención en los primeros 3 segundos.' : ''}
${wantsDescripciones ? '- DEBES generar EXACTAMENTE 3 "descripciones" largas, con llamadas a la acción (CTA) y emojis.' : ''}
${wantsHashtags ? '- DEBES generar EXACTAMENTE 2 arreglos de "hashtags" reales y categorizados.' : ''}
${wantsYoutubeTags ? '- DEBES generar EXACTAMENTE 10 etiquetas SEO relevantes para YouTube en el campo "youtubeTags".' : ''}`;

        const userMessage = `
TEXTO BASE / GUION / IDEA:
"""
${text}
"""

PLATAFORMA OBJETIVO: ${platform}
META PRINCIPAL: ${goal || 'Engagement'}

Por favor, devuelve el JSON con las variaciones solicitadas basadas en este texto, optimizadas para ${platform} buscando lograr ${goal || 'Engagement'}.
`;

        let result;
        try {
            const haikuRes = await generateIdeasWithHaiku({
                apiKey: process.env.ANTHROPIC_API_KEY,
                systemPrompt,
                userMessage,
            });
            result = haikuRes.parsed;
        } catch (genErr) {
            console.error('[generate-copys] Gen Error:', genErr);
            return NextResponse.json({ error: 'La IA no pudo procesar la solicitud. Por favor intenta de nuevo.' }, { status: 500 });
        }

        if (!result) {
            return NextResponse.json({ error: 'La IA devolvió un formato vacío. Por favor intenta de nuevo.' }, { status: 500 });
        }

        // Handle case where Anthropic library might wrap the single object in an array
        if (Array.isArray(result)) {
            result = result[0];
        }

        if (!result.titulos && !result.ganchos && !result.descripciones) {
            return NextResponse.json({ error: 'La IA devolvió un formato inválido. Por favor intenta de nuevo.' }, { status: 500 });
        }

        // Add to stats
        if (projectId) {
            await supabase.rpc('increment_project_stat', { p_project_id: projectId, p_column: 'hooks_generated', p_amount: 1 });
        }

        return NextResponse.json({ result: result });

    } catch (err) {
        console.error('[generate-copys] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
