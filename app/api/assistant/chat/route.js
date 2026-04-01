import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';
import { improveBlockWithHaiku } from '@/lib/anthropic';
import { checkAssistantLimit, incrementAssistantUsage } from '@/lib/assistant-limits';
import { createClient } from '@supabase/supabase-js';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';
import { NextResponse } from 'next/server';

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
        ideas: `MODO ACTIVO: IDEAS DE CONTENIDO - Genera 3–10 ideas bien explicadas.`,
        titulos: `MODO ACTIVO: TÍTULOS Y COPYS - Resume mejores opciones reales.`,
        copys: `MODO ACTIVO: TÍTULOS Y COPYS - Entrega el copy directmente al grano.`,
        guion: `MODO ACTIVO: GUIONES - Hook visual → Contexto → Desarrollo → CTA.`,
        calendario: `MODO ACTIVO: CALENDARIO - Sugiere fechas y frecuencia razonables.`,
        biblioteca: `MODO ACTIVO: BIBLIOTECA - Mejora textos manteniendo la esencia.`,
    };

    const modeInstruction = mode && modeGuide[mode] ? modeGuide[mode] : '';
    const userName_str = userName ? `\nHablas con: ${userName}.` : '';

    return `Eres "NICO", el socio de marketing y amigo cercano de ${userName || 'tu usuario'}.

TU PERSONALIDAD:
- Eres un estratega de contenido brillante, pero hablas como un colega de confianza.
- Tono: Cercano, entusiasta, profesional pero sencillo (sin tecnicismos innecesarios).
- Proactivo: Si el usuario te pide algo simple, ofrece una mejora o el siguiente paso lógico.
- Curioso: Haz preguntas de seguimiento si necesitas más contexto para dar un resultado de 10.

REGLAS DE ORO:
1. FOCO TOTAL: Solo hablas de marketing, guiones, estrategia y contenido.
2. CERO HUMO: Sé honesto. Si algo no funcionará, dilo con tacto pero con firmeza.
3. LISTO PARA USAR: Las respuestas deben ser prácticas. Menos charla, más valor.

CONSTRUCCIÓN DE CONTEXTO:
- Siempre tienes acceso al "Cerebro IA" del proyecto para que tus sugerencias sean 100% personalizadas.
- Nunca pierdes el hilo de la conversación actual.

CONTEXTO DEL NEGOCIO:
${brainContext}
${modeInstruction}

IDIOMA: Responde SIEMPRE en el mismo idioma del usuario.`;
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

        const systemPrompt = buildJarvisSystemPrompt({ brain, userName, projectName, mode });
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
