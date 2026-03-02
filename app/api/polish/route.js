import { NextResponse } from 'next/server';
import { improveBlockWithHaiku } from '@/lib/anthropic';

export async function POST(request) {
    try {
        const { text } = await request.json();
        const apiKey = process.env.ANTHROPIC_API_KEY;

        const systemPrompt = `Mejora este texto para que suene más profesional, persuasivo y natural en español. 
No cambies el significado, solo la redacción. Responde SOLO con el texto mejorado.`;

        const userPrompt = `Texto: ${text}`;

        const { content: polishedText } = await improveBlockWithHaiku({
            apiKey,
            systemPrompt,
            userMessage: userPrompt,
        });

        return NextResponse.json({ polishedText: polishedText.trim() });
    } catch (err) {
        console.error('Error en polish:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
