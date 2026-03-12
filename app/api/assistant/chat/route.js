import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
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

        // Charge 1 credit
        const creditResult = await chargeCredits(supabase, userId, 1, 'assistant_chat', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Load Cerebro IA
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
- Base de conocimiento: ${brain.knowledge_raw ? brain.knowledge_raw.substring(0, 1500) : 'No configurado'}
=============================` : '';

        const modeContext = mode ? `\nModo activado: ${mode}. El usuario quiere ayuda específica con: ${mode}.` : '';

        const systemPrompt = `Eres el Asistente IA oficial de WRITI.AI — la herramienta de marketing y creación de contenido más avanzada.

Eres un experto en:
- Marketing digital y copywriting de respuesta directa
- Creación de guiones virales para Reels, TikTok, YouTube
- Títulos y copys que generan engagement
- Estrategia de contenido y planificación de calendarios
- Storytelling y narrativas que conectan con audiencias

IDIOMA: Responde SIEMPRE en el mismo idioma del usuario. Si el usuario escribe en español, responde en español.
${brainContext}
${modeContext}

REGLAS DE COMPORTAMIENTO:
1. Adapta SIEMPRE tus respuestas al Cerebro IA del proyecto activo — usa su tono, estilo, audiencia y nicho.
2. Sé concreto, útil y accionable. Nada de respuestas genéricas.
3. Cuando generes ideas, títulos, copys o guiones:
   - Ofrece 3-5 opciones cuando sea pertinente.
   - Usa formato legible con emojis y saltos de línea.
   - Indica al final que el usuario puede guardarlos en su Biblioteca o planificarlos en el Calendario.
4. Si el usuario no tiene Cerebro IA configurado, sugiere que lo configure en la sección "Cerebro IA".
5. Eres cercano, motivador y profesional — como un estratega de contenido personal.`;

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        // Build message history (last 10 messages)
        const historyMessages = (messages || []).slice(-10).map(m => ({
            role: m.role,
            content: m.content
        }));

        const response = await anthropic.messages.create({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1500,
            system: systemPrompt,
            messages: historyMessages
        });

        const reply = response.content[0]?.text || 'No pude generar una respuesta. Intenta de nuevo.';

        return NextResponse.json({ reply });

    } catch (error) {
        console.error('[assistant/chat] Error:', error);
        return NextResponse.json({ error: 'Tuvimos un problema al conectar con la IA. Intenta de nuevo en unos segundos.' }, { status: 500 });
    }
}
