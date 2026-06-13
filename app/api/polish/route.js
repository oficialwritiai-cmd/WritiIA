import { NextResponse } from 'next/server';
import { PolishSchema } from '@/lib/validations';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { improveBlockWithHaiku } from '@/lib/anthropic';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';

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

        const { text, projectId, instruction } = validation.data;

        // SECURITY: verify JWT — never trust userId from the body (prevents charging another user's credits)
        const { user, supabase } = await getServerSession(request);
        if (!user) return unauthorized();
        if (projectId) {
            const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
            if (!hasAccess) return forbidden('No tienes permiso para acceder a este proyecto.');
        }
        const userId = user.id;

        // 3. Credit pre-check (read-only). We charge AFTER the AI succeeds so the
        // user never loses a credit on a failed call.
        const { data: creditPre } = await supabase
            .from('users_profiles').select('credits_balance, is_admin').eq('id', userId).single();
        if (!creditPre?.is_admin && (Number(creditPre?.credits_balance) || 0) < CREDIT_COSTS.POLISH) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        const systemPrompt = `Eres un editor experto en ganchos y conceptos virales.
Tu tarea es "madurar" y profesionalizar la idea del usuario.

REGLAS:
1. NO CAMBIES EL TEMA CENTRAL. Si el usuario habla de "X", mantén "X".
2. Mejora la redacción para que sea más impactante, use palabras de poder y despierte curiosidad.
3. Mantén la misma estructura/enfoque que el usuario escribió, solo hazlo sonar como un creador de contenido Pro.
4. Responde SOLO con el texto mejorado, sin explicaciones ni comillas.
${instruction ? `5. Sigue esta instrucción específica del usuario: "${instruction}"` : ''}`;

        const { content: polishedText } = await improveBlockWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage: `Texto: ${text}`,
        });

        // Charge only after the AI call succeeded.
        await chargeCredits(supabase, userId, CREDIT_COSTS.POLISH, 'polish_text', projectId);

        return NextResponse.json({ polishedText: polishedText.trim() });

    } catch (err) {
        // SECURITY: Never expose err.message to client — may contain internal paths/data
        console.error('[polish] Internal error:', err);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
