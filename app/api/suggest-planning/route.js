import { NextResponse } from 'next/server';
import { generateIdeasWithHaiku } from '@/lib/anthropic';

export async function POST(req) {
    try {
        const { topic, platform, brainProfile, existingEvents } = await req.json();

        const systemPrompt = `Eres un experto en estrategia de contenidos y algoritmos de redes sociales.
Responde ÚNICAMENTE con un array JSON válido que contenga un solo objeto con este formato exacto:
[{
  "suggestedDate": "YYYY-MM-DD",
  "suggestedTime": "HH:MM",
  "reasoning": "Breve explicación de por qué este día y hora son óptimos"
}]`;

        const userMessage = `Tu objetivo es sugerir la MEJOR fecha y hora para publicar un contenido.
1. Tema: "${topic}"
2. Plataforma: "${platform}"
3. Perfil de Marca: "${JSON.stringify(brainProfile)}"
4. Eventos ya programados (EVITA ESTAS FECHAS COMPLETAMENTE): ${JSON.stringify(existingEvents)}

REGLAS:
- NO sugieras fechas que ya estén en la lista de eventos programados.
- Elige una hora óptima para la plataforma (ej: tarde/noche para TikTok/Reels, mañana para LinkedIn).
- Hoy es ${new Date().toISOString().split('T')[0]}, sugiere una fecha a partir de mañana.
- Devuelve SOLO el JSON solicitado.`;

        const { parsed } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage
        });

        // El parser de anthropic devuelve un array por defecto basado en nuestras otras funciones
        const result = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : parsed;

        if (!result.suggestedDate) {
            throw new Error('La respuesta de la IA no incluyó una fecha sugerida válida.');
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error in suggest-planning with Anthropic:', error);
        return NextResponse.json({ error: 'Error suggesting planning' }, { status: 500 });
    }
}
