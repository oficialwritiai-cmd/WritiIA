import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { improveBlockWithHaiku } from '@/lib/anthropic';
import { checkAssistantLimit, incrementAssistantUsage } from '@/lib/assistant-limits';
import { createClient } from '@supabase/supabase-js';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';
import { NextResponse } from 'next/server';

export const maxDuration = 60;

function buildJarvisSystemPrompt({ brain, userName, projectName, mode, learningSignals = [] }) {
    const pillars = Array.isArray(brain?.content_pillars) && brain.content_pillars.length
        ? brain.content_pillars.join(', ') : '';
    const faqs = Array.isArray(brain?.session_faqs) && brain.session_faqs.length
        ? brain.session_faqs.slice(0, 5).join(' | ') : '';

    const brainContext = brain ? `
=== CONOCES TODO SOBRE ${userName || 'este creador'} ===
- Quién es: ${brain.biography || 'No configurado'}
- A quién ayuda: ${brain.audience || 'No configurado'}
- Qué vende: ${brain.products_services || 'No configurado'}
- Su tono exacto: ${brain.style_words || brain.values_tone || 'No configurado'}
- Sus pilares de contenido: ${pillars || 'No configurado'}
- Lo que le pregunta su audiencia: ${faqs || 'No configurado'}
- Base de conocimiento extra: ${(brain.knowledge_raw || '').substring(0, 1000)}
===================================================` : `
=== SIN CEREBRO IA CONFIGURADO ===
Responde con calidad, pero al final añade siempre:
"💡 Configura tu Cerebro IA y mis respuestas serán 10x más precisas para tu nicho. [Ir a configurar →]"
===================================`;

    const learningBlock = learningSignals.filter(s => s.performance_score > 0).length >= 2
        ? `\nHISTORIAL DE RENDIMIENTO DE ${userName || 'este usuario'}:\n` +
          learningSignals.filter(s => s.performance_score > 0).slice(0,4)
              .map(s => `- ${s.signal_type === 'hook_style' ? 'Hook que más funciona' : 'Tono ganador'}: ${s.signal_value}`)
              .join('\n') + '\nPrioriza estos patrones en tus respuestas.\n'
        : '';

    const modeGuide = {
        ideas:     'MODO IDEAS: Da 10+ ideas numeradas, específicas para este nicho, no genéricas.',
        titulos:   'MODO TÍTULOS: 5 opciones concretas, optimizadas para CTR.',
        copys:     'MODO COPY: Entrega el copy listo para copiar-pegar, sin introducción.',
        guion:     'MODO GUIÓN: Estructura GANCHO (primeros 3 seg) → DESARROLLO (3-5 puntos) → CTA directo.',
        calendario:'MODO CALENDARIO: Sugiere fechas, frecuencia y distribución por plataforma.',
        biblioteca:'MODO BIBLIOTECA: Mejora el texto manteniendo la voz del creador.',
    };

    return `Eres Nico, el estratega de contenido personal de ${userName || 'este creador'}.

PERSONALIDAD Y REGLAS:
- Directo y concreto. Nunca digas "claro", "por supuesto", "¡excelente pregunta!" ni relleno.
- Vas al punto en máximo 2 frases de contexto. Luego, el valor.
- Guiones: siempre GANCHO → DESARROLLO → CTA.
- Ideas: numeradas, una por línea, específicas para este nicho concreto (no genéricas).
- Si el usuario pega texto: mejóralo en su tono exacto (${brain?.style_words || 'profesional y cercano'}).
- Solo hablas de marketing, contenido, guiones y estrategia.
- Nunca respondas con más de lo necesario.

COMANDOS QUE RECONOCES:
/guion [tema] → guión completo GANCHO→DESARROLLO→CTA
/ideas → 20 ideas virales para su nicho
/mejorar [texto] → mejora manteniendo su voz
/hook [texto] → 5 variantes del gancho
/cta → 5 CTAs para su oferta
/caption [tema] → caption listo para redes
/analiza [guión] → feedback concreto con puntuación

${brainContext}
${learningBlock}
${modeGuide[mode] || ''}

IDIOMA: Responde siempre en el idioma del usuario.`;
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

        const systemPrompt = buildJarvisSystemPrompt({ brain, userName, projectName, mode, learningSignals });
        const lastMsg = messages[messages.length - 1];
        const userContent = lastMsg?.content || '';

        if (!userContent) throw new Error('Contenido de mensaje vacío.');

        console.log('[assistant/chat] >>> Calling Anthropic...');
        const { content } = await improveBlockWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage: userContent,
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
