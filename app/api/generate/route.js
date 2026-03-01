import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    try {
        const { topic, platform, tone, userId, mode, goal, count, ideas } = await request.json();

        if (!topic) {
            return NextResponse.json(
                { error: 'Faltan campos obligatorios: tema.' },
                { status: 400 }
            );
        }

        // Limit count to 4 for "single" mode
        const requestedCount = Math.min(Number(count) || 1, 4);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (!userId) {
            return NextResponse.json({ error: 'No se detectó sesión de usuario.' }, { status: 401 });
        }

        // 1. Credit Check
        const { data: credits, error: creditError } = await supabase
            .from('ai_credits')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (creditError) {
            console.error('Error fetching credits:', creditError);
            // If the user doesn't have a record yet, try initializing it
            if (creditError.code === 'PGRST116') {
                const { data: newCredits } = await supabase.from('ai_credits').insert({ user_id: userId, total_credits: 200, used_credits: 0 }).select().single();
                if (!newCredits) throw new Error('No se pudieron inicializar tus créditos.');
            } else {
                throw new Error('Error al verificar tus créditos de IA.');
            }
        }

        const cost = 5;
        const available = (credits?.total_credits || 0) - (credits?.used_credits || 0);

        if (available < cost) {
            return NextResponse.json(
                { error: 'Has agotado tus créditos de IA. Actualiza tu plan o compra más créditos.' },
                { status: 402 }
            );
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey || apiKey === 'placeholder-anthropic-key') {
            return NextResponse.json(
                { error: 'La API Key central de Claude no está configurada.' },
                { status: 500 }
            );
        }

        let brandContextString = '';

        // Fetch Brand Brain
        const { data: brandBrain } = await supabase
            .from('brand_brain')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (brandBrain) {
            const knowledgeRaw = brandBrain.knowledge_raw || '';
            const trimmedKnowledge = knowledgeRaw.length > 5000
                ? knowledgeRaw.substring(0, 5000) + '... [Trunkated]'
                : knowledgeRaw;

            brandContextString = `
CONTEXTO DE MARCA DEL USUARIO (Cerebro IA):
- Biografía/Historia: ${brandBrain.biography || ''}
- Audiencia Objetivo: ${brandBrain.audience || ''}
- Valores y Tono: ${brandBrain.values_tone || ''}
- Nicho y Temas: ${brandBrain.niche_topics || ''}
- Conocimiento Extra: ${trimmedKnowledge}
`;
        }

        const systemPrompt = `Eres un guionista experto en contenido corto (Reels, TikTok, Shorts) en español.

Has analizado miles de vídeos virales en 2024–2026 y dominas:
- Psicología de la atención
- Storytelling corto
- Ganchos de alto CTR
- Estructuras AIDA y PAS adaptadas a vídeo corto

Siempre que generes guiones:
1) Léete el CONTEXTO DE MARCA (Cerebro IA) del usuario si está disponible.
2) Adapta el lenguaje, ejemplos y tono a esa marca.
3) Ten claro:
   - Plataforma
   - Objetivo (seguidores, autoridad, ventas, etc.)
   - Tipo de contenido (error, historia, lista, etc.)

Reglas absolutas:
- Prohibido usar frases genéricas tipo "en el mundo actual", "en este vídeo te voy a enseñar".
- Cada guion debe tener un ÁNGULO CLARO y DIFERENTE (error, promesa fuerte, historia personal, hack, comparación, etc.).
- El gancho es la parte más importante: debe provocar curiosidad, sorpresa o identificación inmediata.
- El desarrollo debe ser accionable, con ejemplos concretos, no teoría.
- La CTA debe pedir una sola acción clara y coherente con el objetivo.

${brandContextString}

Responde solo con JSON válido:
[
  {
    "titulo_angulo": "nombre del ángulo (ej: El error que te frena)",
    "gancho": "gancho fuerte, máximo 15–18 palabras",
    "desarrollo": [
      "punto 1 accionable",
      "punto 2 con ejemplo o contraste",
      "punto 3 que prepara la CTA"
    ],
    "cta": "llamada a la acción específica"
  }
]`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 4096,
                temperature: 0.8,
                system: systemPrompt,
                messages: [{
                    role: 'user',
                    content: `Genera exactamente ${requestedCount} guiones virales sobre: ${topic}. 
                    Plataforma: ${platform}. 
                    Objetivo: ${goal || 'Autoridad y Engagement'}. 
                    Tono: ${tone}. 
                    Detalles extra: ${ideas || 'Ninguno'}.
                    Asegúrate de que cada guión tenga un ángulo totalmente diferente.`
                }],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error de Anthropic API');
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || '';

        let results = [];
        try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                results = JSON.parse(jsonMatch[0]);
            } else {
                // Try parsing as object if array not found
                const objMatch = content.match(/\{[\s\S]*\}/);
                if (objMatch) {
                    const obj = JSON.parse(objMatch[0]);
                    results = obj.scripts || (Array.isArray(obj) ? obj : [obj]);
                }
            }
        } catch (parseErr) {
            console.error('Error parseando JSON de IA:', content);
            throw new Error('La IA devolvió un formato inválido. Intenta de nuevo.');
        }

        if (!Array.isArray(results)) {
            results = [results];
        }

        // Usage Logging (Sonnet 3.5: $3/1M in, $15/1M out)
        const inTokens = data.usage?.input_tokens || 0;
        const outTokens = data.usage?.output_tokens || 0;
        const totalTokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

        // Approx cost in EUR
        const estimatedCost = ((inTokens * 3 / 1000000) + (outTokens * 15 / 1000000)) * 0.95;

        try {
            await supabase.from('usage_logs').insert({
                user_id: userId,
                action: 'generate_scripts',
                tokens_used: totalTokens,
                cost_eur: estimatedCost
            });

            // Increment used_credits
            await supabase.rpc('increment_used_credits', { u_id: userId, amount: 5 });

        } catch (logErr) {
            console.error('Error logging usage:', logErr);
        }

        return NextResponse.json({ scripts: results });
    } catch (err) {
        console.error('Error del servidor:', err);
        return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
    }
}
