import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
    try {
        const { topic, platform, brainProfile, existingEvents } = await req.json();

        const prompt = `
Actúa como un experto en estrategia de contenidos y algoritmos de redes sociales.
Tu objetivo es sugerir la MEJOR fecha y hora para publicar un contenido basado en:
1. Тema: "${topic}"
2. Plataforma: "${platform}"
3. Perfil de Marca: "${JSON.stringify(brainProfile)}"
4. Eventos ya programados (EVITA ESTAS FECHAS): ${JSON.stringify(existingEvents)}

REGLAS:
- No sugieras fechas que ya estén en la lista de eventos programados.
- Elige una hora óptima para la plataforma (ej: tarde/noche para TikTok/Reels, mañana para LinkedIn).
- Responde ÚNICAMENTE con un objeto JSON válido con este formato:
{
  "suggestedDate": "YYYY-MM-DD",
  "suggestedTime": "HH:MM",
  "reasoning": "Breve explicación de por qué este día y hora son óptimos"
}
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Eres un estratega de contenido experto. Responde solo en JSON." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content);
        return NextResponse.json(result);

    } catch (error) {
        console.error('Error in suggest-planning:', error);
        return NextResponse.json({ error: 'Error suggesting planning' }, { status: 500 });
    }
}
