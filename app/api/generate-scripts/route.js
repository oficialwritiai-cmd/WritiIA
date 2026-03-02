import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GenerateScriptSchema } from '@/lib/validations';
import rateLimit from '@/lib/rate-limit';
import { generateScriptsWithSonnet } from '@/lib/anthropic';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 15, ip); // Max 15 per minute
        } catch (rateErr) {
            return NextResponse.json({ error: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.' }, { status: 429, headers: resObj.headers });
        }

        const body = await request.json();
        const validation = GenerateScriptSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Datos de entrada inválidos', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { topic, platform, tone, userId, count, goal, ideas } = validation.data;
        const requestedCount = count || 1;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (!userId) {
            return NextResponse.json({ error: 'No se detectó sesión de usuario.' }, { status: 401 });
        }

        // 1. Credit Check (5 credits per generation session)
        const { data: credits, error: creditError } = await supabase
            .from('ai_credits')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (creditError) {
            if (creditError.code === 'PGRST116') {
                const { data: newCredits } = await supabase.from('ai_credits').insert({ user_id: userId, total_credits: 200, used_credits: 0 }).select().single();
                if (!newCredits) throw new Error('No se pudieron inicializar tus créditos.');
            } else {
                throw new Error('Error al verificar tus créditos de IA.');
            }
        }

        const cost = 5;
        const totalCredits = credits?.total_credits || 200;
        const usedCredits = credits?.used_credits || 0;
        const available = totalCredits - usedCredits;

        if (available < cost) {
            return NextResponse.json(
                { error: 'Has agotado tus créditos de IA. Actualiza tu plan o compra más créditos.' },
                { status: 402 }
            );
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'La API Key de Claude no está configurada en el servidor.' }, { status: 500 });
        }

        let brandContextString = '';
        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();

        if (brandBrain) {
            brandContextString = `
CONTEXTO DE MARCA (Cerebro IA):
- Bio: ${brandBrain.biography || ''}
- Audiencia: ${brandBrain.audience || ''}
- Tono: ${brandBrain.values_tone || ''}
- Nicho: ${brandBrain.niche_topics || ''}
`;
        }

        const systemPrompt = `Eres un guionista experto en contenido viral (Reels, TikTok, Shorts, LinkedIn) en español.
Dominas la psicología de la atención y el storytelling corto.
Siempre adaptas el tono al CONTEXTO DE MARCA del usuario.

REGLAS:
- Gancho fuerte (provoca curiosidad).
- Desarrollo accionable y concreto.
- CTA única y clara.
- NO uses frases genéricas de IA como "en este vídeo...".

${brandContextString}

Responde SOLO en JSON:
[
  {
    "titulo_angulo": "nombre del ángulo",
    "gancho": "texto del gancho",
    "desarrollo": ["punto 1", "punto 2", "punto 3"],
    "cta": "texto de la llamada a la acción"
  }
]`;

        const userMessage = `Genera ${requestedCount} guiones sobre: ${topic}. 
Plataforma: ${platform}. 
Objetivo: ${goal || 'Autoridad'}. 
Tono: ${tone}. 
Ideas extra: ${ideas || 'Ninguna'}.`;

        const { parsed: results, usage } = await generateScriptsWithSonnet({
            apiKey,
            systemPrompt,
            userMessage,
        });

        // Log usage & charge credits
        const totalTokens = (usage?.input_tokens || 0) + (usage?.output_tokens || 0);
        const estimatedCost = (((usage?.input_tokens || 0) * 3 / 1000000) + ((usage?.output_tokens || 0) * 15 / 1000000)) * 0.95;

        await supabase.from('usage_logs').insert({
            user_id: userId,
            action: 'generate_scripts',
            tokens_used: totalTokens,
            cost_eur: estimatedCost
        });

        await supabase.rpc('increment_used_credits', { u_id: userId, amount: cost });

        return NextResponse.json({ scripts: results });

    } catch (err) {
        console.error('Error en generate-scripts:', err);
        return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
    }
}
