import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { topic, platform, tone, brandName, mode, brandContext } = await request.json();

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

        let contextString = '';
        if (brandContext) {
            contextString = `
CONTEXTO DE MARCA (USA ESTO PARA PERSONALIZAR EL CONTENIDO):
- Biografía/Historia: ${brandContext.bio || 'No proporcionada'}
- Audiencia Objetivo: ${brandContext.audience || 'No proporcionada'}
- Valores y Tono: ${brandContext.values || 'No proporcionados'}
- Nicho y Temas Clave: ${brandContext.niche || 'No proporcionado'}
`;
        }

        let systemPrompt = '';

        if (mode === 'viral') {
            systemPrompt = `Eres un estratega de contenido viral y experto en SEO.

${contextString}

Analiza el tema: "${topic}" para identificar ángulos disruptivos y objetivos de búsqueda de alto tráfico.
Tu objetivo es generar 5 IDEAS ESTRATÉGICAS que maximicen el CTR y la retención.
Usa marcos psicológicos como "Curiosidad Negativa", "El Puente del Deseo" o "La Verdad Incómoda".

Responde SOLO con JSON válido con esta estructura:
[
  {
    "objetivo": "Objetivo SEO o de búsqueda específico",
    "gancho": "Gancho viral (Hook) disruptivo para iniciar el contenido",
    "explicacion": "Análisis psicológico de por qué esta idea funcionará (tendencias, sesgos cognitivos)"
  }
]`;
        } else {
            systemPrompt = `Eres un Growth Hacker y Guionista Senior experto en contenido vertical de alto impacto. 

${contextString}

Genera 5 guiones PROFESIONALES para ${platform} sobre: "${topic}".
Marca: ${brandName || 'Genérica'}. Tono: ${tone || 'Profesional'}.

REGLAS DE ORO:
1. Estructura: Gancho (0-3s), Retención (3-15s), Valor (15-45s), CTA (45s+).
2. Usa el marco AIDA (Atención, Interés, Deseo, Acción) y las 4U (Urgente, Único, Ultra-específico, Útil).
3. Evita clichés de IA ("¿Alguna vez te has preguntado...?", "En el mundo de hoy...").
4. Incluye instrucciones de edición (B-roll sugerido, texto en pantalla).

Responde SOLO con JSON válido con esta estructura:
[
  {
    "gancho": "Hook de alto impacto (Atención)",
    "desarrollo": ["Puntos clave de retención y valor"],
    "cta": "Llamada a la acción estratégica",
    "insights": {
        "viralidad": "Puntuación 1-100",
        "retencion_tip": "Consejo técnico de edición para este guión",
        "visual_cue": "Sugerencia de lo que debe verse en pantalla al inicio"
    }
  }
]`;
        }

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
                messages: [
                    {
                        role: 'user',
                        content: systemPrompt,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Error de Anthropic API:', errText);
            return NextResponse.json(
                { error: 'Error al comunicarse con la API de generación.' },
                { status: 502 }
            );
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || '';

        let results;
        try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                results = JSON.parse(jsonMatch[0]);
            } else {
                results = JSON.parse(content);
            }
        } catch (parseError) {
            console.error('Error al parsear respuesta:', content);
            return NextResponse.json(
                { error: 'Error al procesar la respuesta de la IA. Intenta de nuevo.' },
                { status: 500 }
            );
        }

        if (!Array.isArray(results) || results.length === 0) {
            return NextResponse.json(
                { error: 'La IA no generó resultados válidos. Intenta de nuevo.' },
                { status: 500 }
            );
        }

        if (mode === 'viral') {
            return NextResponse.json({ ideas: results });
        } else {
            const normalizedScripts = results.slice(0, 5).map((s) => ({
                gancho: s.gancho || '',
                desarrollo: Array.isArray(s.desarrollo) ? s.desarrollo : [],
                cta: s.cta || '',
                insights: s.insights || { viralidad: 'N/A', retencion_tip: 'N/A', visual_cue: 'N/A' }
            }));
            return NextResponse.json({ scripts: normalizedScripts });
        }
    } catch (err) {
        console.error('Error del servidor:', err);
        return NextResponse.json(
            { error: 'Error interno del servidor.' },
            { status: 500 }
        );
    }
}
