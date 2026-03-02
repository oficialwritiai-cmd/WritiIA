import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RefineSchema } from '@/lib/validations';
import rateLimit from '@/lib/rate-limit';
import { improveBlockWithHaiku } from '@/lib/anthropic';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 25, ip);
        } catch (rateErr) {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const body = await request.json();
        const validation = RefineSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
        }

        const { text, type, context, userId } = validation.data;
        const apiKey = process.env.ANTHROPIC_API_KEY;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const systemPrompt = `Mejora el ${type} (gancho, desarrollo o cta) de un guion viral.
Mantén la intención original pero hazlo más claro y potente.
Alineado con: ${context || 'redes sociales'}. 
Responde SOLO con la versión final mejorada.`;

        const userPrompt = `Texto a mejorar: ${text}`;

        const { content: refinedText } = await improveBlockWithHaiku({
            apiKey,
            systemPrompt,
            userMessage: userPrompt,
        });

        await supabase.rpc('increment_used_credits', { u_id: userId, amount: 1 });

        return NextResponse.json({ refinedText: refinedText.trim() });
    } catch (err) {
        console.error('Error en refine:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
