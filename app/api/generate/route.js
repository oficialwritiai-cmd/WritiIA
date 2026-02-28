import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    try {
        const { topic, platform, tone, userId, mode } = await request.json();

        if (!topic) {
            return NextResponse.json(
                { error: 'Faltan campos obligatorios: tema.' },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (!userId) {
            return NextResponse.json({ error: 'No se detectó sesión de usuario.' }, { status: 401 });
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

        const systemPrompt = `Eres el mejor experto en guiones virales para redes sociales en español.

Siempre que recibas una petición:
1) Lee primero el CONTEXTO DE MARCA (Cerebro IA) del usuario.
2) Entiende quién es, a quién habla, cuál es su tono y de qué temas habla.
3) Luego analiza los datos de la petición:
   - Tema principal: ${topic}
   - Plataforma: ${platform}
   - Objetivo: ${request.goal || 'Autoridad y Engagement'}
   - Tono deseado: ${tone}
   - Número de guiones: ${request.count || 5}

Tu tarea:
- Proponer entre 5 y 10 guiones completamente diferentes entre sí.
- Cada guión debe tener:
  · titulo_angulo → nombre corto del ángulo (ej: "El error que te está frenando", "El método de 7 días")
  · gancho → frase inicial que detenga el scroll (curiosidad, sorpresa o identificación)
  · desarrollo → 3 puntos accionables y concretos
  · cta → llamada a la acción específica

Reglas:
- Nada genérico, nada de relleno.
- El gancho es crítico: evita saludos y presentaciones.
- Adapta ritmo y lenguaje a ${platform}.
- Usa el estilo y expresiones del Contexto de Marca si está disponible.

${brandContextString}

Responde SOLO con JSON válido:
[
  {
    "titulo_angulo": "string",
    "gancho": "string",
    "desarrollo": [
      "punto 1",
      "punto 2",
      "punto 3"
    ],
    "cta": "string"
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
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4096,
                temperature: 0.7,
                messages: [{ role: 'user', content: systemPrompt }],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error de Anthropic API');
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || '';
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const results = JSON.parse(jsonMatch ? jsonMatch[0] : content);

        // Usage Logging (Sonnet 3.5: $3/1M in, $15/1M out)
        const inTokens = data.usage?.input_tokens || 0;
        const outTokens = data.usage?.output_tokens || 0;
        const totalTokens = data.usage?.total_tokens || 0;
        // Approx cost in EUR (rough estimate: 1$ = 0.92€)
        const estimatedCost = ((inTokens * 3 / 1000000) + (outTokens * 15 / 1000000)) * 0.95;

        await supabase.from('usage_logs').insert({
            user_id: userId,
            action: 'generate_scripts',
            tokens_used: totalTokens,
            cost_eur: estimatedCost
        });

        return NextResponse.json({ scripts: results });
    } catch (err) {
        console.error('Error del servidor:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
