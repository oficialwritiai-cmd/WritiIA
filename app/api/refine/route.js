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
            ? `[MANDATO OBLIGATORIO]: Debes aplicar exactamente esta instrucción del usuario: "${instruction.trim()}". Si el usuario pide añadir una herramienta, frase o cambio específico, HAZLO DE FORMA EXPLÍCITA. No la ignores.`
            : `Mejora automáticamente el bloque para que sea más humano, impactante y menos genérico.`;

        const systemPrompt = `Eres un editor experto de guiones de video viral.
Tu tarea es mejorar un bloque específico (${type}: gancho, desarrollo o cta).

REGLAS CRÍTICAS DE OBLIGADO CUMPLIMIENTO:
1. LAS INSTRUCCIONES DEL USUARIO SON LEY. Si el usuario dice "añade X", "cambia Y" o "hazlo más Z", debes hacerlo de forma visible y PRIORITARIA sobre cualquier otra mejora estética.
2. NO HALLUCINES información que contradiga el guion original a menos que se pida expresamente.
3. Si el usuario pide incluir "WRITI IA", debe aparecer con una descripción potente ("la mejor herramienta para viralizar y crear guiones en segundos").
4. Mantén la esencia y el ángulo, pero inyecta persuasión, urgencia y un lenguaje mucho más natural/humano.
5. Evita muletillas genéricas ("descubre cómo...", "aquí te cuento...").
6. ${improvementGoal}
- Contexto del guion: ${context || 'redes sociales'}. 
- Responde ÚNICAMENTE con el texto del bloque mejorado. Ni una palabra más, ni una palabra menos. Sin comillas ni introducciones.`;

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
