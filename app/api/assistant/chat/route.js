import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { chatWithHistory } from '@/lib/anthropic';
import { checkAssistantLimit, incrementAssistantUsage } from '@/lib/assistant-limits';
import { createClient } from '@supabase/supabase-js';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

function buildNicoSystemPrompt({ brain, userName, projectName, mode, learningSignals = [] }) {
    const pillars = Array.isArray(brain?.content_pillars) && brain.content_pillars.length
        ? brain.content_pillars.join(', ') : 'no especificados';
    const faqs = Array.isArray(brain?.session_faqs) && brain.session_faqs.length
        ? brain.session_faqs.slice(0, 4).join(' | ') : '';
    const topSignals = learningSignals.filter(s => s.performance_score > 0).slice(0, 3)
        .map(s => `· ${s.signal_type === 'hook_style' ? 'Hook ganador' : 'Tono que funciona'}: ${s.signal_value}`)
        .join('\n');

    const brainBlock = brain ? `
== CONTEXTO DEL CREADOR ==
Nombre: ${userName || 'Sin nombre'}
Quién es: ${brain.biography || 'No configurado'}
A quién ayuda: ${brain.audience || 'No configurado'}
Qué vende: ${brain.products_services || 'No configurado'}
Su tono: ${brain.style_words || brain.values_tone || 'profesional y cercano'}
Sus pilares de contenido: ${pillars}
FAQs de su audiencia: ${faqs || 'No hay datos aún'}
${topSignals ? `Lo que mejor le funciona:\n${topSignals}` : ''}
${brain.knowledge_raw ? `Conocimiento extra: ${brain.knowledge_raw.substring(0, 800)}` : ''}
== FIN CONTEXTO ==` : `
== SIN CEREBRO IA ==
Responde con calidad usando el contexto de la conversación.
Al final de tu PRIMERA respuesta de la sesión añade (solo una vez):
"💡 Con tu Cerebro IA configurado mis respuestas serán mucho más precisas. [Configurar →]"
== FIN ==`;

    return `Eres Nico, asistente de contenido de Writi.AI para ${userName || 'este creador'}.

PERSONALIDAD — NO NEGOCIABLE:
· Directo como un estratega senior. Actúas primero, preguntas después si es necesario.
· Nunca dices: "Claro", "Por supuesto", "Entendido", "Necesito claridad", "¡Excelente!"
· Nunca haces lista de preguntas numeradas.
· Máximo UNA pregunta al final si es estrictamente necesario. Nunca al principio.
· Respuestas cortas por defecto. El usuario pide más si quiere más.
· Si tienes suficiente contexto del Cerebro IA → responde directamente, no pidas más info.
· Si falta algo, asume lo más probable y actúa.

REGLA DE ORO: Cuando el usuario pide ideas, guiones o mejoras → ENTREGA INMEDIATAMENTE.
No interrogues. No pidas formato, audiencia ni objetivo. Usa el Cerebro IA.

${brainBlock}

COMANDOS:
/guion [tema] → guión completo GANCHO→DESARROLLO→CTA
/ideas → 5 ideas concretas para su nicho (no 20, máximo 5)
/mejorar [texto] → mejora en su tono exacto
/hook [texto] → 3 variantes del gancho
/cta → 3 CTAs para su oferta
/caption [tema] → caption listo para copiar
/analiza [guión] → feedback concreto con puntuación

FORMATO PARA IDEAS (máximo 5 por respuesta):
Cada idea en formato:
💡 [Título concreto y específico para su nicho]
📱 [Plataforma recomendada] · ⏱ [Duración sugerida]

Nunca des 20 ideas de golpe. Si el usuario quiere más: "¿Quieres 5 más o desarrollamos una?"

FORMATO PARA GUIONES (usar EXACTAMENTE esto):
## GANCHO
[texto del gancho — primeros 3 segundos]

## DESARROLLO
· 01 · [primer punto]
· 02 · [segundo punto]
· 03 · [tercer punto]

## CTA
[llamada a la acción directa]

FORMATO PARA ESTRATEGIA/CONSEJOS:
Máximo 3 puntos. Sin numeración larga. Sin headers innecesarios. Directo al grano.

SITUACIONES Y RESPUESTA CORRECTA:
· Usuario pide ideas → Da 3-5 ideas específicas para su nicho. Sin preguntar nada.
· Usuario pide guión → Genera DIRECTAMENTE. Sin preguntar formato ni audiencia.
· Usuario hace pregunta vaga → Asume lo más probable, actúa, UNA pregunta al final máximo.
· Usuario ya respondió algo → No lo preguntes de nuevo (tienes el historial).

LO QUE NUNCA HACES:
❌ Lista de preguntas numeradas antes de responder
❌ Pedir formato/audiencia/objetivo antes de dar el contenido
❌ Dar 20 ideas cuando 5 bastan
❌ Respuestas de +200 palabras sin que se pidan
❌ Repetir lo que el usuario dijo antes de responder
❌ "¿Quieres que te ayude con X?" cuando ya deberías estar haciéndolo

IDIOMA: Siempre el idioma del usuario.`;
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { projectId: rawProjectId, messages, mode, userName } = body;
        
        const projectId = (rawProjectId && rawProjectId !== 'null' && rawProjectId !== 'undefined') ? rawProjectId : null;
        console.log('[assistant/chat] >>> INCOMING REQUEST:', { userId: 'verifying...', projectId, messageCount: messages?.length });

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Faltan datos (messages no es un array).' }, { status: 400 });
        }

        const { user, supabase } = await getServerSession(req);
        if (!user) {
            console.error('[assistant/chat] ERR: No session');
            return unauthorized();
        }
        console.log('[assistant/chat] >>> USER VERIFIED:', user.id);

        // Verify project ownership
        if (projectId) {
            const { data: projCheck } = await supabase.from('projects').select('id').eq('id', projectId).eq('user_id', user.id).single();
            if (!projCheck) {
                console.error(`[assistant/chat] ERR: Access denied to project ${projectId}`);
                return forbidden('No tienes acceso a este proyecto');
            }
        }

        // Check usage limits
        const serviceSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const limitCheck = await checkAssistantLimit(serviceSupabase, user.id);
        if (!limitCheck.allowed) {
            const msg = limitCheck.reason === 'DAILY_CAP_REACHED'
                ? 'Has alcanzado el límite diario del asistente. Vuelve mañana.'
                : `Límite alcanzado. Vuelve en ${limitCheck.waitMinutes} minutos.`;
            return NextResponse.json({ error: msg }, { status: 429 });
        }

        // Load Cerebro IA
        let brain = null;
        let projectName = null;
        try {
            if (projectId) {
                const { data: brainData } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
                brain = brainData;
                const { data: proj } = await supabase.from('projects').select('name').eq('id', projectId).single();
                projectName = proj?.name || null;
            }
            if (!brain) {
                const { data } = await supabase.from('brand_brain').select('*').eq('user_id', user.id).single();
                brain = data;
            }
        } catch (dbErr) {
            console.warn('[assistant/chat] DB Warning (Brain):', dbErr.message);
        }

        // Load learning signals for personalized responses
        let learningSignals = [];
        try {
            const { data: signals } = await supabase
                .from('cerebro_learning_signals')
                .select('signal_type, signal_value, performance_score')
                .eq('user_id', user.id)
                .order('performance_score', { ascending: false })
                .limit(6);
            learningSignals = signals || [];
        } catch(e) { /* non-fatal */ }

        const systemPrompt = buildNicoSystemPrompt({ brain, userName, projectName, mode, learningSignals });

        // Últimos 6 mensajes para dar contexto de conversación a Nico
        const lastMsg = messages[messages.length - 1];
        const userContent = lastMsg?.content || '';
        if (!userContent) throw new Error('Contenido de mensaje vacío.');

        const conversationWindow = messages.slice(-6); // últimos 6 mensajes

        console.log('[assistant/chat] >>> Calling Anthropic with history:', conversationWindow.length, 'messages');
        const { content } = await chatWithHistory({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            messages: conversationWindow,
        });
        console.log('[assistant/chat] >>> Anthropic Success:', content.substring(0, 30) + '...');

        try {
            const tokenEstimate = (content?.length || 0) / 4;
            await incrementAssistantUsage(serviceSupabase, user.id, Math.ceil(tokenEstimate));
        } catch (usageErr) {
            console.warn('[assistant/chat] Usage log failed (ignoring):', usageErr.message);
        }

        return NextResponse.json({ reply: content });

    } catch (error) {
        console.error('[assistant/chat] CRITICAL ERROR:', error);
        return NextResponse.json({ 
            error: error?.message || 'Error en el servidor de chat.',
            stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        }, { status: 500 });
    }
}
