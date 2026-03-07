import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GeneratePlanSchema } from '@/lib/validations';
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
            await limiter.check(resObj, 5, rlKey);
        } catch {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const validation = GeneratePlanSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
        }

        const { description, platforms, frequency, focus, userId, selectedIdeas } = validation.data;
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // Credit Check & Charge (3 credits)
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.GENERATE_PLAN, 'generate_plan');
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Fetch Brand Brain
        let brandContextString = '';
        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();

        if (brandBrain) {
            brandContextString = `PERFIL: ${brandBrain.biography || ''}. ESTILO: ${brandBrain.style_words || ''}.`;
        } else {
            return NextResponse.json({ error: 'Falta configuración de Cerebro IA (Paso 1).' }, { status: 400 });
        }

        const systemPrompt = `Eres un estratega de contenido premium.
${brandContextString}
Diseña un PLAN DE CONTENIDO para 30 días. Responde ÚNICAMENTE en JSON array.`;

        const userMessage = `Descripción: ${description}. Frecuencia: ${frequency}.`;

        const { parsed: results } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        const { data: planData, error: planErr } = await supabase.from('content_plans').insert({
            user_id: userId, month: new Date().getMonth() + 1, year: new Date().getFullYear(),
            frequency, platforms, focus
        }).select().single();

        if (planErr) throw planErr;

        const slotsToInsert = results.map(r => ({
            plan_id: planData.id, user_id: userId, day_number: Number(r.dia) || 1,
            platform: r.plataforma, content_type: r.tipo_contenido, idea_title: r.titulo_idea, goal: r.objetivo
        }));

        await supabase.from('content_slots').insert(slotsToInsert);

        return NextResponse.json({ plan: planData, slots: results });

    } catch (err) {
        console.error('[generate-plan] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
