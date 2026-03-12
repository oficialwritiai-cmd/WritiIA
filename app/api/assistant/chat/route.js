import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chargeCredits } from '@/lib/credits';

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
=============================` : '\n(No hay Cerebro IA configurado para este proyecto aún)';

        const modeContext = mode ? `\nModo activo: ${mode}. Enfoca tu ayuda en esto.` : '';

        const systemPrompt = `Eres el Asistente IA oficial de WRITI.AI — la herramienta de marketing y creación de contenido más avanzada.

Eres un experto en:
- Marketing digital y copywriting de respuesta directa
- Creación de guiones virales para Reels, TikTok, YouTube Shorts y YouTube
- Títulos y copys que generan engagement y retención
- Estrategia de contenido y planificación de calendarios editoriales
- Storytelling y narrativas que conectan con audiencias

IDIOMA: Responde SIEMPRE en el mismo idioma del usuario. Si el usuario escribe en español, responde en español.
${brainContext}${modeContext}

REGLAS:
1. Adapta SIEMPRE tus respuestas al Cerebro IA del proyecto — usa su tono, estilo, audiencia y nicho.
2. Sé concreto, útil y accionable. Sin respuestas vagas o genéricas.
3. Cuando generes ideas, títulos, copys o guiones:
   - Ofrece 3-5 opciones cuando sea pertinente.
   - Usa formato legible con emojis y saltos de línea claros.
4. Si el usuario no tiene Cerebro IA, sugiere configurarlo en la sección "Cerebro IA".
5. Eres cercano, motivador y profesional — como un estratega de contenido personal experto.`;

        // Use direct fetch like lib/anthropic.js does internally
        const cleanApiKey = (process.env.ANTHROPIC_API_KEY || '').replace(/['"\\s]/g, '').trim();

        // Build message history (last 10 turns)
        const historyMessages = (messages || []).slice(-10).map(m => ({
            role: m.role,
            content: m.content
        }));

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': cleanApiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 1500,
                system: systemPrompt,
                messages: historyMessages
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[assistant/chat] Anthropic error:', errText);
            throw new Error('Error conectando con la IA');
        }

        const data = await response.json();
        const reply = data.content?.[0]?.text || 'No pude generar respuesta. Intenta de nuevo.';

        return NextResponse.json({ reply });

    } catch (error) {
        console.error('[assistant/chat] Error:', error);
        return NextResponse.json({
            error: 'Tuvimos un problema al conectar con la IA. Intenta de nuevo en unos segundos.'
        }, { status: 500 });
    }
}
