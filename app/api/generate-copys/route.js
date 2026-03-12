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

        const { text, platform, goal, userId, projectId } = body;

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

        const systemPrompt = `Eres un copywriter experto en redes sociales.
${brandContextString}

Tu objetivo es generar variaciones de TÍTULOS, GANCHOS (Hooks), DESCRIPCIONES (Copys) y HASHTAGS a partir de un texto base o guion proporcionado por el usuario.

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "titulos": ["título 1", "título 2", "título 3", "título 4", "título 5"],
  "ganchos": ["gancho 1", "gancho 2", "gancho 3", "gancho 4", "gancho 5"],
  "descripciones": ["descripción larga 1", "descripción larga 2", "descripción larga 3"],
  "hashtags": [
    ["#hash1", "#hash2", "#hash3"],
    ["#tag1", "#tag2", "#tag3"]
  ]
}

REGLAS ESTRICTAS:
- Los "titulos" deben ser ultra-llamativos y cortos.
- Los "ganchos" deben captar la atención en los primeros 3 segundos.
- Las "descripciones" deben acompañar el post (copy), incluir llamadas a la acción (CTA) y emojis.
- Los "hashtags" deben ser 2 o 3 arreglos de hashtags reales y categorizados, no inventados al azar.`;

        const userMessage = `
TEXTO BASE / GUION / IDEA:
"""
${text}
"""

PLATAFORMA OBJETIVO: ${platform}
META PRINCIPAL: ${goal || 'Engagement'}

Por favor, devuelve el JSON con las variaciones solicitadas basadas en este texto, optimizadas para ${platform} buscando lograr ${goal || 'Engagement'}.
`;

        const { parsed: result } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

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
