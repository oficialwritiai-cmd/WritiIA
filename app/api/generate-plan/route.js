import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GeneratePlanSchema } from '@/lib/validations';
import rateLimit from '@/lib/rate-limit';
import { generateIdeasWithHaiku } from '@/lib/anthropic';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 5, ip);
        } catch (rateErr) {
            return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: resObj.headers });
        }

        const body = await request.json();
        const validation = GeneratePlanSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
        }

        const { description, platforms, frequency, focus, tone, context, userId } = validation.data;
        const apiKey = process.env.ANTHROPIC_API_KEY;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let postCount = 12;
        if (frequency === '4 publicaciones por semana') postCount = 16;
        if (frequency === '5 publicaciones por semana') postCount = 20;
        if (frequency === '7 publicaciones por semana') postCount = 28;

        const systemPrompt = `Diseña un PLAN DE CONTENIDO para 30 días en español.
Responde ÚNICAMENTE en JSON array:
[
  {
    "dia": 1,
    "plataforma": "...",
    "tipo_contenido": "...",
    "titulo_idea": "...",
    "objetivo": "..."
  }
]`;

        let brandContextString = '';
        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();

        if (brandBrain) {
            brandContextString = `
PERFIL DEL CREADOR (Cerebro IA):
- Bio/Quién es: ${brandBrain.biography || ''}
- Qué vende/Productos: ${brandBrain.products_services || ''}
- A quién ayuda: ${brandBrain.audience || ''}
- Estilo: ${brandBrain.style_words || ''}
- Tono general: ${brandBrain.values_tone || ''}
`;
        } else {
            return NextResponse.json({ error: 'Falta configuración de Cerebro IA (Paso 1).' }, { status: 400 });
        }

        const systemPrompt = `Eres un estratega de contenido premium especializado en planes mensuales agresivos y persuasivos.
Tu misión es crear piezas que no parezcan escritas por una IA. 

REGLAS DE ORO:
1. MARCA PERSONAL: Inyecta la voz del creador basándote en su Cerebro IA.
2. ESTRUCTURA: Los guiones deben ser rápidos, directos y con frases cortas.
3. CERO CLICHÉS: Prohibido "Hoy te traigo...", "Seguro que...", "En este vídeo...".

${brandContextString}

${systemPrompt}


        const { parsed: results, usage } = await generateIdeasWithHaiku({
            apiKey,
            systemPrompt,
            userMessage,
        });

        // Insert logs & plan into DB (similar to existing logic but cleaned up)
        const totalTokens = (usage?.input_tokens || 0) + (usage?.output_tokens || 0);
        await supabase.from('usage_logs').insert({ user_id: userId, action: 'generate_plan', tokens_used: totalTokens });

        const { data: planData } = await supabase.from('content_plans').insert({
            user_id: userId, month: new Date().getMonth() + 1, year: new Date().getFullYear(),
            frequency, platforms, focus
        }).select().single();

        const slotsToInsert = results.map(r => ({
            plan_id: planData.id, user_id: userId, day_number: Number(r.dia) || 1,
            platform: r.plataforma, content_type: r.tipo_contenido, idea_title: r.titulo_idea, goal: r.objetivo
        }));

        const { data: slotData } = await supabase.from('content_slots').insert(slotsToInsert).select();

        return NextResponse.json({ plan: planData, slots: slotData });
    } catch (err) {
        console.error('Error en generate-plan:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
