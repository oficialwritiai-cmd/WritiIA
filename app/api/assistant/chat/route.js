import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { chargeCredits } from '@/lib/credits';
import { improveBlockWithHaiku } from '@/lib/anthropic';

export const maxDuration = 60;

function buildJarvisSystemPrompt({ brain, userName, projectName, mode }) {
    const brainContext = brain ? `
=== CEREBRO IA DEL PROYECTO: "${projectName || 'Sin nombre'}" ===
- Biografía / Historia: ${brain.biography || 'No configurado'}
- Público objetivo: ${brain.audience || 'No configurado'}
- Productos / Servicios: ${brain.products_services || 'No configurado'}
- Nicho y Temas: ${brain.niche_topics || 'No configurado'}
- Tono y Valores: ${brain.values_tone || 'No configurado'}
- Palabras clave de estilo: ${brain.style_words || 'No configurado'}
- Base de conocimiento: ${(brain.knowledge_raw || '').substring(0, 2000)}
=================================================` : `
=== SIN CEREBRO IA CONFIGURADO ===
Este proyecto no tiene Cerebro IA aún. Sugiere amablemente al usuario que lo configure en la sección "Cerebro IA".
=================================`;

    const modeGuide = {
        ideas: `
MODO ACTIVO: IDEAS DE CONTENIDO
- Genera 3–10 ideas bien explicadas, con título + breve descripción (máximo 3 líneas por idea).
- Alinea con el Cerebro IA y la etapa real del negocio.
- Finaliza ofreciendo 1 o 2 siguientes pasos claros en forma de pregunta (ej: "¿Te convierto alguna en guion?").`,
        titulos: `
MODO ACTIVO: TÍTULOS Y COPYS
- Resume 2–3 mejores opciones en lenguaje natural, corto y directo.
- Entrega el Copy final LISTO PARA PEGAR sin rellenos.`,
        copys: `
MODO ACTIVO: TÍTULOS Y COPYS
- Entrega el copy o descripción *directamente* al grano. Nada de "Aquí tienes tu copia...".
- Para YouTube: Línea 1 (contexto+beneficio) + 2-3 líneas (proceso/promesa) + Última línea (CTA).`,
        guion: `
MODO ACTIVO: GUIONES
- Hook visual (3 palabras) → Contexto corto → Desarrollo → CTA.
- Sin introducciones narrativas largas. Directo al texto del guion.`,
        calendario: `
MODO ACTIVO: CALENDARIO
- Sugiere fechas y frecuencia razonables. Directo: "¿Lo agendamos para el jueves?"`,
        biblioteca: `
MODO ACTIVO: BIBLIOTECA
- Mejora textos manteniendo la esencia. Directo al texto reescrito.`,
    };

    const modeInstruction = mode && modeGuide[mode] ? modeGuide[mode] : '';
    const userName_str = userName ? `\nHablas con: ${userName}. No repitas su nombre en todos los mensajes.` : '';

    return `Eres "WRITI JARVIS", el estratega de contenido y marketer experto del usuario.${userName_str}

REGLAS ESTRICTAS DE PERSONALIDAD (MEJORA JARVIS V3.5):
1. CERO HUMO NI INVENCIONES: NUNCA asumas logros falsos (ej. "tengo 10,000 clientes" o "mi próspera agencia") si no están explícitos en el Cerebro IA o en el mensaje del usuario. Sé crudo, honesto y real. Entiende la fase real del usuario (ej: si recién lanza, asume fase de lanzamiento).
2. MUY CORTO Y DIRECTO: Frases cortas, sin relleno. Cero discursos de motivación largos. Elimina para siempre frases basura como "En este valioso contenido aprenderás..." o "No te pierdas esta oportunidad...".
3. LENGUAJE HUMANO: Habla como un marketer humano enviando un mensaje por Slack a un colega. Natural y al grano.
4. TEXTOS LISTOS PARA USAR: Si el usuario pide una descripción o copy, entrégalo limpio, listo para copiar y pegar. Sin introducciones.
   - Formato YouTube ideal: Línea 1 (Contexto+beneficio), Líneas 2-3 (Qué se ve en el vídeo/proceso), Última (CTA+Red social).
5. DINÁMICA JARVIS PROACTIVA: Al final de tu respuesta, no digas "espero que te sirva". Ofrece 1-2 acciones concretas:
   - "¿Te preparo ahora el guion del video?"
   - "¿Quieres 5 títulos alternativos para este ángulo?"
   - "¿Lo mandamos al calendario de la próxima semana?"

CONTEXTO DEL PROYECTO (USAR COMO VERDAD ABSOLUTA):
${brainContext}
${modeInstruction}

IDIOMA: Responde SIEMPRE en el mismo idioma del usuario.`;
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { userId, projectId, messages, mode, userName } = body;

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

        // Load Cerebro IA (project-scoped first, fallback global legacy)
        let brain = null;
        let projectName = null;
        if (projectId) {
            const { data: brainData } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brain = brainData;
            const { data: proj } = await supabase.from('projects').select('name').eq('id', projectId).single();
            projectName = proj?.name || null;
        }
        if (!brain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();
            brain = data;
        }

        // Build the full Jarvis system prompt
        const systemPrompt = buildJarvisSystemPrompt({ brain, userName, projectName, mode });

        // Build conversation history (last 10 messages)
        const historyMessages = (messages || []).slice(-10);
        const lastMsg = historyMessages[historyMessages.length - 1];
        const userMessage = lastMsg?.content || '';

        // Previous turns as context block
        const previousContext = historyMessages.slice(0, -1).map(m =>
            `${m.role === 'user' ? 'Usuario' : 'JARVIS'}: ${m.content}`
        ).join('\n\n');

        const fullUserMessage = previousContext
            ? `[Historial de conversación]\n${previousContext}\n\n[Mensaje actual del usuario]\n${userMessage}`
            : userMessage;

        // Use the existing anthropic lib (handles API key correctly)
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
