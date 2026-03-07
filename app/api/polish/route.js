import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PolishSchema } from '@/lib/validations';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { improveBlockWithHaiku } from '@/lib/anthropic';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';

// Polish is expensive (calls AI), so apply a tight rate limit
const limiter = rateLimit({
    interval: 60 * 1000,    // 1 minute window
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        // 1. Rate limiting (compound key: IP + userId from body for pre-validation check)
        const ip = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();
        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 20, ip); // 20 polish requests/min per IP
        } catch {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes. Intenta más tarde.' },
                { status: 429, headers: resObj.headers }
            );
        }

        // 2. Validate & sanitize inputs
        const body = await request.json();
        const validation = PolishSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const { text, userId } = validation.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 3. Charge Credits (1 credit) - blocks unauthenticated users too via userId UUID check
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.POLISH, 'polish_text');
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        const systemPrompt = `Mejora este texto para que suene más profesional y persuasivo. 
Responde SOLO con el texto mejorado, sin explicaciones adicionales.`;

        const { content: polishedText } = await improveBlockWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage: `Texto: ${text}`,
        });

        return NextResponse.json({ polishedText: polishedText.trim() });

    } catch (err) {
        // SECURITY: Never expose err.message to client — may contain internal paths/data
        console.error('[polish] Internal error:', err);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
