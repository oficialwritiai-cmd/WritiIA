import { NextResponse } from 'next/server';
import { GenerateIdeasSchema } from '@/lib/validations';
import rateLimit from '@/lib/rate-limit';

const limiter = rateLimit({
    interval: 60 * 1000,
    uniqueTokenPerInterval: 500,
});

export async function POST(req) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        const resObj = new NextResponse();
        try {
            await limiter.check(resObj, 15, ip); // Max 15 generation of ideas per minute
        } catch (rateErr) {
            return NextResponse.json({ error: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.' }, { status: 429, headers: resObj.headers });
        }

        const body = await req.json();
        const validation = GenerateIdeasSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Datos de entrada inválidos para crear ideas', details: validation.error.errors },
                { status: 400 }
            );
        }

        const { context, platforms, useSEO, useTikTok, goal, count, userId } = validation.data;

        const systemPrompt = `Actúas como estratega de contenido viral en español, especializado en contenido corto (Reels, TikTok, Shorts) y formatos largos (YouTube, Blog/SEO). Tienes conocimiento actualizado sobre tendencias, formatos y temas que están funcionando bien en los últimos meses.

Tu tarea:
- Generar IDEAS DE CONTENIDO, no guiones completos.
- Cada idea debe estar pensada para una plataforma específica, tener un ángulo claro y un potencial alto de viralidad o conversión según el objetivo.

Requisitos:
- Aprovecha patrones virales actuales: challenges, hooks típicos, formatos de lista, "cosas que nadie te cuenta", antes/después, duos/reacts.
- En caso de SEO/Blog o YouTube, piensa en títulos con alta intención de búsqueda actual.
- Responde ÚNICAMENTE con JSON válido en este preciso formato de array de objetos y NUNCA incluyas texto fuera del JSON:
[
  {
    "plataforma": "nombre de la plataforma",
    "tipo_idea": "challenge / lista / historia / error / comparativa / hack / mito / etc.",
    "titulo_idea": "título llamativo para la pieza",
    "descripcion": "2-3 líneas que expliquen cómo sería el contenido",
    "objetivo": "seguidores / ventas / autoridad / viralidad"
  }
]`;

        const userPrompt = `
Genera ${count} ideas de contenido altamente virales.
Nicho o Producto: ${context}
Plataformas Seleccionadas: ${platforms.join(', ')}
Objetivo Principal: ${goal}
Utilizar tendencias recientes de Google / SEO: ${useSEO ? 'Sí' : 'No'}
Utilizar tendencias recientes de TikTok / Reels: ${useTikTok ? 'Sí' : 'No'}

Por favor, devuélveme el array JSON.
`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 3000,
                temperature: 0.8,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("API Error de Anthropic:", data);
            throw new Error(data.error?.message || 'Error al conectar con la IA');
        }

        const rawText = data.content?.[0]?.text || '[]';
        const cleanJsonStr = rawText.match(/\[[\s\S]*\]/)?.[0] || '[]';
        let ideas;
        try {
            ideas = JSON.parse(cleanJsonStr);
        } catch (e) {
            console.error("Error parseando JSON de IA:", cleanJsonStr);
            throw new Error("La IA no devolvió un formato válido.");
        }

        return NextResponse.json({ ideas });

    } catch (error) {
        console.error("Error completo en generar-ideas:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
