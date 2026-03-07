import { NextResponse } from 'next/server';
import { GenerateIdeasSchema } from '@/lib/validations';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { createClient } from '@supabase/supabase-js';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(req) {
    try {
        const ip = (req.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
        }

        const resObj = new NextResponse();
        try {
            const rlKey = buildRateLimitKey(ip, body?.userId);
            await limiter.check(resObj, 15, rlKey);
        } catch {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const validation = GenerateIdeasSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const { context, platforms, useSEO, useTikTok, goal, count, userId } = validation.data;

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // Charge Credits BEFORE AI call
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.GENERATE_IDEAS, 'generate_ideas');
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Fetch Brand Brain
        let brandContextString = '';
        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();

        if (brandBrain) {
            brandContextString = `Cerebro IA del creador: ${brandBrain.biography || ''}. Estilo: ${brandBrain.style_words || ''}.`;
        } else {
            return NextResponse.json({ error: 'Falta configuración de Cerebro IA (Paso 1).' }, { status: 400 });
        }

        const systemPrompt = `Eres un estratega de contenido viral experto.
${brandContextString}

Genera IDEAS DE CONTENIDO de alto impacto para redes sociales. 
Responde EXCLUSIVAMENTE con un array JSON válido.

Format:
[
  {
    "titulo": "...",
    "hook": "...",
    "descripcion": "...",
    "plataforma": "...",
    "tipo_contenido": "...",
    "cta": "..."
  }
]`;

        const userPrompt = `Genera ${count} ideas para: ${context}. 
Plataformas: ${platforms.join(', ')}. 
Objetivo: ${goal}.`;

        const ideasData = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage: userPrompt,
        });

        const ideas = ideasData?.parsed || [];

        return NextResponse.json({ ideas });

    } catch (err) {
        console.error('[generate-ideas] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
