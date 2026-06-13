import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RefineSchema } from '@/lib/validations';
import rateLimit, { buildRateLimitKey } from '@/lib/rate-limit';
import { improveBlockWithHaiku } from '@/lib/anthropic';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';

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

        const { text, texts, type, context, instruction, projectId } = validation.data;
        const inputTexts = texts || (Array.isArray(text) ? text : [text]);
        const isBulk = inputTexts.length > 1 || ['titles', 'hooks', 'descriptions', 'hashtags_groups'].includes(type);

        // SECURITY: verify JWT — never trust userId from the body (prevents charging another user's credits)
        const { user, supabase } = await getServerSession(request);
        if (!user) return unauthorized();
        if (projectId) {
            const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
            if (!hasAccess) return forbidden('No tienes permiso para acceder a este proyecto.');
        }
        const userId = user.id;

        // Charge Credits (1 credit per call)
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.REFINE, 'refine_block', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        const systemPrompt = `PROMPT INTERNO – REFINAMIENTO Y EDICIÓN EXPERTA
        
Rol de la IA:
Eres un copywriter y estratega de marketing digital de nivel senior. Tu tarea es editar y mejorar contenido social.

idioma: ESPAÑOL (Responde SIEMPRE en español).

REGLAS DE ORO:
1. FIDELIDAD TOTAL AL TEMA: No inventes hechos, resultados ni datos que no estén en el texto original o en el contexto.
2. CUMPLIMIENTO EXPLÍCITO: Tu prioridad es aplicar el cambio solicitado por el usuario: "${instruction || 'Mejora general'}".
3. TONO ESTRATÉGICO: Mantén la autoridad y el enfoque persuasivo.
4. FORMATO DE SALIDA:
   - Si recibes una lista de textos, responde ÚNICAMENTE con un array JSON de strings: ["Refinado 1", "Refinado 2", ...].
   - Si recibes un solo texto, responde ÚNICAMENTE con el texto refinado (sin comillas, sin intro).

REGLA CRÍTICA: Responde SOLO con el contenido refinado (o el array JSON si es bulk).`;

        const userMessage = isBulk 
            ? `Por favor refina esta lista de ${type} siguiendo el mandato: "${instruction}":\n${JSON.stringify(inputTexts)}`
            : `Refina este ${type} siguiendo el mandato: "${instruction}":\n"${inputTexts[0]}"`;

        const { content: rawRefined } = await improveBlockWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        let finalResult = rawRefined.trim();
        
        // Clean up potential AI artifacts like markdown code blocks
        if (finalResult.startsWith('```json')) finalResult = finalResult.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        else if (finalResult.startsWith('```')) finalResult = finalResult.replace(/^```\n?/, '').replace(/\n?```$/, '');

        // If bulk, try to parse it
        if (isBulk) {
            try {
                const parsed = JSON.parse(finalResult);
                return NextResponse.json({ refinedText: parsed });
            } catch (e) {
                // If it failed to parse as JSON but we wanted bulk, maybe it returned line by line
                const lines = finalResult.split('\n').filter(l => l.trim().length > 2);
                if (lines.length === inputTexts.length) {
                    return NextResponse.json({ refinedText: lines });
                }
                // Fallback: return the raw result if we can't parse it
                return NextResponse.json({ refinedText: finalResult });
            }
        }

        return NextResponse.json({ refinedText: finalResult });

    } catch (err) {
        console.error('[refine] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
