import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { improveBlockWithHaiku } from '@/lib/anthropic';

export async function POST(request) {
    try {
        const { text, userId } = await request.json();
        const apiKey = process.env.ANTHROPIC_API_KEY;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (!userId) {
            return NextResponse.json({ error: 'No se detectó sesión de usuario.' }, { status: 401 });
        }

        // Credit check (1 credit)
        const cost = 1;
        const { data: profile, error: creditError } = await supabase
            .from('users_profiles')
            .select('credits_balance')
            .eq('id', userId)
            .single();

        if (!profile || profile.credits_balance < cost) {
            return NextResponse.json({ error: 'Créditos insuficientes.' }, { status: 402 });
        }

        const systemPrompt = `Mejora este texto para que suene más profesional, persuasivo y natural en español. 
No cambies el significado, solo la redacción. Responde SOLO con el texto mejorado.`;

        const userPrompt = `Texto: ${text}`;

        const { content: polishedText } = await improveBlockWithHaiku({
            apiKey,
            systemPrompt,
            userMessage: userPrompt,
        });

        // Deduct credits and log usage
        await Promise.all([
            supabase.rpc('decrement_credits_balance', { u_id: userId, amount: cost }),
            supabase.from('usage_logs').insert({
                user_id: userId,
                action: 'polish_text',
                model: 'claude-3-haiku',
                cost_eur: 0.001
            })
        ]);

        return NextResponse.json({ polishedText: polishedText.trim() });
    } catch (err) {
        console.error('Error en polish:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
