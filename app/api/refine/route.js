import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    try {
        const { text, type, context, userId } = await request.json();

        if (!text || !type || !userId) {
            return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Credit Check
        const { data: credits, error: creditError } = await supabase
            .from('ai_credits')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (creditError) throw new Error('Error al verificar tus créditos de IA.');

        const cost = 1;
        const available = (credits?.total_credits || 0) - (credits?.used_credits || 0);

        if (available < cost) {
            return NextResponse.json(
                { error: 'Has agotado tus créditos de IA. Actualiza tu plan o compra más créditos.' },
                { status: 402 }
            );
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'La API Key de Claude no está configurada.' }, { status: 500 });
        }

        const systemPrompt = `Actúas como editor senior de guiones para contenido viral en español.

El usuario te dará SOLO el ${type} (gancho, desarrollo o cta) de un guion.

Tu tarea:
- Mejorarlo manteniendo la intención original.
- Hacerlo más claro, más potente y alineado con el tono de marca del usuario.
- No cambies completamente la idea, solo hazla más profesional y atractiva.
- Responde con UNA sola versión final sin explicaciones adicionales.`;

        const userPrompt = `Texto original: ${text}
Contexto: ${context || 'Mejorar para redes sociales'}`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1024,
                temperature: 0.7,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error de Anthropic API');
        }

        const data = await response.json();
        const refinedText = data.content?.[0]?.text || '';

        // Increment used_credits
        await supabase.rpc('increment_used_credits', { u_id: userId, amount: 1 });

        return NextResponse.json({ refinedText: refinedText.trim() });
    } catch (err) {
        console.error('Error del servidor:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
