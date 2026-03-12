import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chargeCredits } from '@/lib/credits';
import { improveBlockWithHaiku } from '@/lib/anthropic';

export const maxDuration = 60;

export async function POST(req) {
    try {
        const body = await req.json();
        const { userId, projectId, messages, mode } = body;

        if (!userId || !messages) {
            return NextResponse.json({ error: 'Faltan datos requeridos.' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Charge 1 credit per message
        const creditResult = await chargeCredits(supabase, userId, 1, 'assistant_chat', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Load Cerebro IA (project-scoped first, fallback legacy)
        let brain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brain = data;
        }
        if (!brain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();
            brain = data;
        }

        const brainContext = brain ? `
=== CEREBRO IA DEL PROYECTO ===
- Autobiografía / Historia: ${brain.biography || 'No configurado'}
- Público objetivo: ${brain.audience || 'No configurado'}
- Productos / Servicios: ${brain.products_services || 'No configurado'}
- Nicho y Temas: ${brain.niche_topics || 'No configurado'}
- Tono y Valores: ${brain.values_tone || 'No configurado'}
- Palabras clave de estilo: ${brain.style_words || 'No configurado'}
- Base de conocimiento: ${(brain.knowledge_raw || '').substring(0, 1500)}
=============================` : '\n(Sin Cerebro IA configurado. Ve a la sección Cerebro IA para entrenarlo.)';

        const modeContext = mode ? `\nModo activo: ${mode}. Enfoca tu ayuda en esto.` : '';

        const systemPrompt = `Eres el Asistente IA oficial de WRITI.AI — herramienta de marketing y creación de contenido.

Eres experto en: marketing digital, copywriting, guiones virales para Reels/TikTok/YouTube, títulos y copys de alto engagement, estrategia de contenido y storytelling.

IDIOMA: Responde SIEMPRE en el mismo idioma del usuario (normalmente español).
${brainContext}${modeContext}

REGLAS:
1. Adapta tus respuestas al Cerebro IA del proyecto: usa su tono, estilo, audiencia y nicho.
2. Sé concreto, útil y accionable. Sin respuestas vagas.
3. Al generar ideas, títulos, copys o guiones: ofrece 3-5 opciones con formato claro (emojis + saltos de línea).
4. Eres cercano, motivador y profesional — como un estratega de contenido personal.`;

        // Build conversation history (last 10 messages)
        const historyMessages = (messages || []).slice(-10);

        // The last message is the current user message
        const lastMsg = historyMessages[historyMessages.length - 1];
        const userMessage = lastMsg?.content || '';

        // Previous turns as context string
        const previousContext = historyMessages.slice(0, -1).map(m =>
            `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`
        ).join('\n\n');

        const fullUserMessage = previousContext
            ? `[Conversación previa]\n${previousContext}\n\n[Mensaje actual del usuario]\n${userMessage}`
            : userMessage;

        // Use the existing lib/anthropic helper (handles API key correctly)
        const { content } = await improveBlockWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage: fullUserMessage,
        });

        const reply = content || 'No pude generar respuesta. Intenta de nuevo.';

        return NextResponse.json({ reply });

    } catch (error) {
        console.error('[assistant/chat] Error:', error?.message || error);
        return NextResponse.json({
            error: 'Tuvimos un problema al conectar con la IA. Intenta de nuevo en unos segundos.'
        }, { status: 500 });
    }
}
