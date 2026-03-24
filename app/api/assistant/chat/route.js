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
        
        // Sanitize projectId (handle 'null' string from frontend)
        const projectId = (rawProjectId && rawProjectId !== 'null' && rawProjectId !== 'undefined') ? rawProjectId : null;

        console.log('[assistant/chat] POST Request:', { projectId, messageCount: messages?.length, mode });

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Faltan datos requeridos (messages).' }, { status: 400 });
        }

        // ─────────────────────────────────────────────────────────────
        // SECURITY: Verify Session & Project Ownership
        // ─────────────────────────────────────────────────────────────
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[assistant/chat] Error: SUPABASE_SERVICE_ROLE_KEY is missing');
            return NextResponse.json({ error: 'Configuración del servidor incompleta (Env vars).' }, { status: 500 });
        }

        const { user, supabase } = await getServerSession(req);
        if (!user) {
            console.error('[assistant/chat] Unauthorized: No user session found');
            return unauthorized();
        }

        if (projectId) {
            const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
            if (!hasAccess) {
                console.error(`[assistant/chat] Forbidden: User ${user.id} has no access to project ${projectId}`);
                return forbidden('No tienes permiso para acceder a este proyecto.');
            }
        }

        // Rate Limiting
        const serviceSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const limitResult = await checkAssistantLimit(serviceSupabase, user.id);
        
        if (!limitResult.allowed) {
            const msg = limitResult.reason === 'DAILY_CAP_REACHED' 
                ? 'Has alcanzado el límite diario. Vuelve mañana para seguir creando con Nico.'
                : `Has enviado muchos mensajes. Nico está tomando un café, vuelve en ${limitResult.waitMinutes} min.`;
            
            return NextResponse.json({ error: msg, code: 'RATE_LIMIT' }, { status: 429 });
        }

        // Charge credits (v8.2.0 - Free mode)
        try {
            await chargeCredits(supabase, user.id, CREDIT_COSTS.ASSISTANT_CHAT, 'assistant_chat', projectId);
        } catch (creditErr) {
            console.error('[assistant/chat] Credit Charge Error:', creditErr.message);
            // We continue even if charge fails for Nico (for now) to avoid blocking beta users
        }

        // Load Cerebro IA
        let brain = null;
        let projectName = null;
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

        const systemPrompt = buildJarvisSystemPrompt({ brain, userName, projectName, mode });

        const historyMessages = (messages || []).slice(-15);
        const lastMsg = historyMessages[historyMessages.length - 1];
        const userMessage = lastMsg?.content || '';

        if (!userMessage) throw new Error('El último mensaje está vacío.');

        const previousContext = historyMessages.slice(0, -1).map(m =>
            `${m.role === 'user' ? 'Usuario' : 'NICO'}: ${m.content}`
        ).join('\n\n');

        const fullUserMessage = previousContext
            ? `[Historial Reciente]\n${previousContext}\n\n[Mensaje actual de ${userName || 'Usuario'}]\n${userMessage}`
            : userMessage;

        const { content } = await improveBlockWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage: fullUserMessage,
        });

        const tokenEstimate = (content?.length || 0) / 4;
        await incrementAssistantUsage(serviceSupabase, user.id, Math.ceil(tokenEstimate));

        return NextResponse.json({ reply: content || 'No pude generar respuesta.' });

    } catch (error) {
        console.error('[assistant/chat] Critical Route Error:', error?.message);
        return NextResponse.json({ 
            error: error?.message || 'Error al conectar con la IA.',
            code: 'API_ERROR'
        }, { status: 500 });
    }
}
