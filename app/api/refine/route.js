import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RefineSchema } from '@/lib/validations';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { improveBlockWithHaiku } from '@/lib/anthropic';
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
            await limiter.check(resObj, 25, rlKey);
        } catch {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const validation = RefineSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const { text, type, context, instruction, userId } = validation.data;
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // Charge Credits (1 credit)
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.REFINE, 'refine_block');
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        const improvementGoal = instruction && instruction.trim().length > 0
            ? `El usuario pide específicamente: "${instruction.trim()}"`
            : `Mejora automáticamente el bloque para que sea más humano, impactante y menos genérico.`;

        const systemPrompt = `Eres un editor experto de guiones de video viral.
Tu tarea es mejorar un bloque específico (${type}: gancho, desarrollo o cta).

REGLAS:
- Mantén la idea principal pero hazla más potente y persuasiva.
- Evita frases vacías ("en este video...", "es clave...").
- ${improvementGoal}
- Contexto del guion: ${context || 'redes sociales'}. 
- Responde SOLO con el texto del bloque mejorado, sin introducciones ni comillas.`;

        const { content: refinedText } = await improveBlockWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage: `Texto actual del ${type}: "${text}"`,
        });

        return NextResponse.json({ refinedText: refinedText.trim() });

    } catch (err) {
        console.error('[refine] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
