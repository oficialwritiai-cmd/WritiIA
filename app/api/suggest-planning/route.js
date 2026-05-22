import { NextResponse } from 'next/server';
import { chatWithHistory } from '@/lib/anthropic';
import { getServerSession, unauthorized } from '@/lib/auth-guard';

export async function POST(req) {
    try {
        const { user } = await getServerSession(req);
        if (!user) return unauthorized();

        const { topic, platform, brainProfile, existingEvents } = await req.json();

        const systemPrompt = `Eres un experto en estrategia de contenidos.
Responde ÚNICAMENTE con un objeto JSON válido con este formato exacto (sin markdown, sin explicaciones extra):
{"suggestedDate":"YYYY-MM-DD","suggestedTime":"HH:MM","reasoning":"explicación breve"}`;

        const userMsg = `Sugiere la mejor fecha y hora para publicar:
- Tema: "${topic || 'Contenido general'}"
- Plataforma: "${platform || 'Reels'}"
- Perfil de marca: ${brainProfile ? JSON.stringify({ bio: brainProfile.biography?.slice(0,100), audience: brainProfile.audience?.slice(0,80) }) : 'No configurado'}
- Fechas ya ocupadas (EVITAR): ${JSON.stringify((existingEvents || []).slice(0, 20))}
- Hoy es: ${new Date().toISOString().split('T')[0]}

Reglas: fecha a partir de mañana, hora óptima para la plataforma, evitar fechas ocupadas.
Responde SOLO con el JSON.`;

        // chatWithHistory devuelve {content} sin procesamiento — preserva suggestedDate
        const { content } = await chatWithHistory({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            messages: [{ role: 'user', content: userMsg }],
            maxTokens: 200,
        });

        // Extraer JSON de la respuesta
        let result = null;
        try {
            const match = content.match(/\{[\s\S]*\}/);
            if (match) result = JSON.parse(match[0]);
        } catch {}

        if (!result?.suggestedDate) {
            // Fallback: sugerir fecha automáticamente si la IA falla
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            result = {
                suggestedDate: tomorrow.toISOString().split('T')[0],
                suggestedTime: platform?.toLowerCase().includes('linkedin') ? '09:00' : '18:00',
                reasoning: 'Fecha sugerida automáticamente para mañana en horario óptimo.',
            };
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('[suggest-planning] Error:', error);
        // Fallback en vez de error — siempre da una fecha
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return NextResponse.json({
            suggestedDate: tomorrow.toISOString().split('T')[0],
            suggestedTime: '18:00',
            reasoning: 'Fecha sugerida automáticamente.',
        });
    }
}
