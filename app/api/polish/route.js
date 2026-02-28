import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { text } = await req.json();

        if (!text || text.length < 5) {
            return NextResponse.json({ error: 'Texto demasiado corto' }, { status: 400 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key no configurada en el servidor' }, { status: 500 });
        }

        const systemPrompt = `Eres un experto en branding personal y comunicación estratégica en español.
El usuario te va a pasar un texto informal y poco estructurado sobre su marca personal o negocio.

Tu tarea:
- Reescribir ese texto de forma profesional, clara y precisa.
- Mantener el 100% de la intención y los datos del usuario — no inventes nada.
- Hacer que suene a un brief profesional de marca, no a un texto de chat.
- Destacar: quién es, a quién ayuda, qué resultado consigue y qué tono tiene su comunicación.
- Máximo 5–7 líneas.
- No uses bullet points, escribe en prosa.

Responde SOLO con el texto mejorado, sin explicaciones ni comentarios.`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 400,
                temperature: 0.7,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: `Texto original del usuario:\n${text}`
                    }
                ]
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error en la API de Anthropic');
        }

        const data = await response.json();
        const polishedText = data.content?.[0]?.text || '';

        return NextResponse.json({ polishedText });

    } catch (error) {
        console.error('Error in /api/polish:', error.message);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
