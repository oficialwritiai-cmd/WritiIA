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

        const { description, platforms, frequency, focus, userId, selectedIdeas, projectId } = validation.data;
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

        // Credit Check & Charge (3 credits)
        const creditResult = await chargeCredits(supabase, userId, CREDIT_COSTS.GENERATE_PLAN, 'generate_plan', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Fetch Brand Brain: project-scoped first, fallback to global
        let brandBrain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();
            brandBrain = data;
        }

        let brandContextString = '';
        if (brandBrain) {
            brandContextString = `PERFIL: ${brandBrain.biography || ''}. ESTILO: ${brandBrain.style_words || ''}.`;
        } else {
            return NextResponse.json({ error: 'Falta configuración de Cerebro IA (Paso 1).' }, { status: 400 });
        }

        const systemPrompt = `Eres un estratega de contenido premium.
${brandContextString}
Diseña un PLAN DE CONTENIDO para ${postCount || 30} publicaciones. Responde ÚNICAMENTE en formato JSON (un array de objetos).

CADA OBJETO DEBE TENER ESTAS CLAVES EXACTAS:
- "day_number": número del 1 al 30.
- "platform": string (TikTok, Reels, LinkedIn, etc).
- "content_type": string (educativo, venta, personal, etc).
- "idea_title": un título corto y gancho para el post (OBLIGATORIO).
- "goal": el objetivo del post.

Ejemplo: [{"day_number": 1, "platform": "Reels", "content_type": "Venta", "idea_title": "3 trucos para escalar", "goal": "conversión"}]`;

        const userMessage = `
DESCRIPCIÓN DE LA MARCA/PRODUCTO: ${description}
OBJETIVO/ENFOQUE DEL MES: ${focus}
PLATAFORMAS SELECCIONADAS: ${platforms.join(', ')}
FRECUENCIA: ${frequency}
${selectedIdeas && selectedIdeas.length > 0 ? `IDEAS PREFERIDAS (Usa estas como base para el contenido): \n- ${selectedIdeas.join('\n- ')}` : ''}

IMPORTANTE: El plan debe cubrir 30 días. Si hay menos ideas preferidas que días, genera ideas complementarias siguiendo el mismo estilo y objetivo.
`;

        const { parsed: results } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        const { data: planData, error: planErr } = await supabase.from('content_plans').insert({
            user_id: userId,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            frequency,
            platforms,
            focus
        }).select().single();

        if (planErr) throw planErr;

        const slotsToInsert = results.map((r, index) => {
            // Robust mapping: try all common key variations the AI might produce
            const day = Number(r.day_number || r.dia || r.day || (index + 1));
            const type = r.content_type || r.tipo_contenido || r.type || 'educativo';
            const platform = r.platform || r.plataforma || platforms[0] || 'General';
            const goalStr = r.goal || r.objetivo || focus || 'engagement';

            // Extreme title fallback if AI fails
            const title = r.idea_title || r.titulo_idea || r.titulo || r.title || r.titulo_angulo ||
                `${type.charAt(0).toUpperCase() + type.slice(1)} para ${platform} (${goalStr})`;

            return {
                plan_id: planData.id,
                user_id: userId,
                day_number: day,
                platform: platform,
                content_type: type,
                idea_title: title,
                goal: goalStr
            };
        });

        const { data: slotData, error: slotErr } = await supabase.from('content_slots').insert(slotsToInsert).select();
        if (slotErr) throw slotErr;

        return NextResponse.json({ plan: planData, slots: slotData });

    } catch (err) {
        console.error('[generate-plan] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
