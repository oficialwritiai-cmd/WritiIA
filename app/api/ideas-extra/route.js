import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIdeasWithHaiku } from '@/lib/anthropic';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { IdeasExtraSchema } from '@/lib/validations';

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
            await limiter.check(resObj, 10, rlKey);
        } catch {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes.' },
                { status: 429, headers: resObj.headers }
            );
        }

        // Validate with Zod
        const validation = IdeasExtraSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const { context, experienceLevel, productTicket, objections, examples, userId } = validation.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Charge Credits (1 credit)
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.IDEAS_EXTRA, 'ideas_extra');
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        const systemPrompt = `Eres un generador de ideas de contenido viral para redes sociales.
Tu tarea es crear ideas originales, específicas y accionables basadas en la descripción del usuario.
Responde ÚNICAMENTE con un array JSON válido.`;

        let userMessage = `CONTEXTO: ${context}.`;
        if (experienceLevel) userMessage += ` NIVEL: ${experienceLevel}.`;
        if (productTicket) userMessage += ` TICKET: ${productTicket}.`;
        if (objections) userMessage += ` OBJECIONES: ${objections}.`;
        if (examples) userMessage += ` EJEMPLOS: ${examples}.`;
        userMessage += '\nGenera 6-10 ideas originales.';

        const { parsed: ideas } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        const validIdeas = Array.isArray(ideas) ? ideas.filter(i => i.titulo_idea && i.descripcion) : [];
        return NextResponse.json({ ideas: validIdeas });

    } catch (err) {
        console.error('[ideas-extra] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
