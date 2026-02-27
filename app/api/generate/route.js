import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { topic, platform, tone, userId, mode } = await request.json();

        if (!topic) {
            return NextResponse.json(
                { error: 'Faltan campos obligatorios: tema.' },
                { status: 400 }
            );
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Clave de API de Anthropic no configurada.' },
                { status: 500 }
            );
        }

        const supabase = createSupabaseClient();
        let brandContextString = '';

        // Fetch Brand Brain if userId is provided
        const { data: brandBrain } = userId ? await supabase
            .from('brand_brain')
            .select('*')
            .eq('user_id', userId)
            .single() : { data: null };

        if (brandBrain) {
            const knowledgeRaw = brandBrain.knowledge_raw || '';
            const trimmedKnowledge = knowledgeRaw.length > 8000
                ? knowledgeRaw.substring(0, 8000) + '... [Trunkated]'
                : knowledgeRaw;

            brandContextString = `
CONTEXTO DE MARCA DEL USUARIO:
- Biografía/Historia: ${brandBrain.biography || ''}
- Audiencia Objetivo: ${brandBrain.audience || ''}
- Valores y Tono: ${brandBrain.values_tone || ''}
- Nicho y Temas: ${brandBrain.niche_topics || ''}
- Conocimiento Extra: ${trimmedKnowledge}
`;
        }

        const systemPrompt = `Eres el mejor experto mundial en contenido viral para redes sociales en español.

${brandContextString || 'Si el contexto de marca está vacío, genera guiones profesionales igualmente pero avisa internamente que serán más genéricos.'}

TAREA:
Genera exactamente ${request.count || 5} guiones DIFERENTES y ORIGINALES en español para ${platform} sobre el tema: ${topic}.

Objetivo del contenido: ${request.goal || 'Viralizar'}
Tono: ${tone}
Ideas o ángulos del usuario: ${request.ideas || 'Ninguna'}

REGLAS ABSOLUTAS:
1. Cada guión debe tener un ángulo COMPLETAMENTE diferente al resto.
2. El GANCHO es lo más crítico. Nunca empieces con: "En este vídeo...", "Hola soy...", "Hoy te voy a contar..."
   Usa siempre uno de estos patrones: Pregunta que duele al ICP, Afirmación contraintuitiva, Dato o número específico sorprendente, Secreto revelado, Historia en medias res.
3. El DESARROLLO debe ser accionable, concreto, sin relleno.
4. El CTA debe pedir UNA acción específica, nunca solo "sígueme" o "dale like".
5. Adapta el ritmo al formato:
   - Reels/TikTok: frases cortas, máximo 8 palabras por línea
   - LinkedIn: storytelling, datos, más denso
   - Twitter/X: directo, provocador
6. Usa el lenguaje y estilo del Contexto de Marca si está disponible.
7. PROHIBIDO: palabras genéricas, relleno, sonar a IA.

Responde ÚNICAMENTE con JSON válido:
[
  {
    "numero": 1,
    "angulo": "descripción breve del ángulo",
    "potencial_viral": "alto/medio/bajo",
    "gancho": "texto del gancho",
    "desarrollo": ["punto 1", "punto 2", "punto 3"],
    "cta": "texto del cta"
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
                messages: [{ role: 'user', content: systemPrompt }],
            }),
        });

        if (!response.ok) throw new Error('Error de Anthropic API');

        const data = await response.json();
        const content = data.content?.[0]?.text || '';
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const results = JSON.parse(jsonMatch ? jsonMatch[0] : content);

        // Usage Logging
        if (userId) {
            await supabase.from('usage_logs').insert({
                user_id: userId,
                action: 'generate_scripts',
                tokens_used: data.usage?.total_tokens || 0,
                cost_eur: (data.usage?.total_tokens || 0) * 0.000015 // Estimated cost
            });
        }

        return NextResponse.json({ scripts: results });
    } catch (err) {
        console.error('Error del servidor:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
