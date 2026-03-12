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

        const { text, type, context, instruction, userId, projectId } = validation.data;
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // Charge Credits (1 credit)
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.REFINE, 'refine_block', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        const systemPrompt = `PROMPT INTERNO – REFINAMIENTO Y EDICIÓN EXPERTA
        
Rol de la IA:
Eres un copywriter y estratega de marketing digital de nivel senior. Tu tarea es editar y mejorar un fragmento específico de contenido social (${type}).

REGLAS DE ORO:
1. LA PRIORIDAD ES EL USUARIO: Si el usuario da una instrucción específica ("hazlo más polémico", "menciona X", "usa emojis"), debes cumplirla de forma EXPLÍCITA y VISIBLE.
2. TONO ESTRATÉGICO: Inyecta autoridad, persuasión y claridad. Evita el lenguaje genérico.
3. CONTEXTO: Mantén la coherencia con el objetivo (${context || 'Engagement'}).
4. BREVEDAD: Responde EXCLUSIVAMENTE con el nuevo texto refinado. Sin introducciones, sin comentarios, sin comillas. Solo el contenido.

Mandato actual: ${instruction && instruction.trim() ? instruction : 'Mejora la efectividad y el impacto del texto.'}`;

        const { content: refinedText } = await improveBlockWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage: `Texto original del ${type}: "${text}"`,
        });

        return NextResponse.json({ refinedText: refinedText.trim() });

    } catch (err) {
        console.error('[refine] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
