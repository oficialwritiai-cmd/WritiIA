import { NextResponse } from 'next/server';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';
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
        ideas: `MODO ACTIVO: IDEAS DE CONTENIDO - Genera 3–10 ideas bien explicadas.`,
        titulos: `MODO ACTIVO: TÍTULOS Y COPYS - Resume mejores opciones reales.`,
        copys: `MODO ACTIVO: TÍTULOS Y COPYS - Entrega el copy directmente al grano.`,
        guion: `MODO ACTIVO: GUIONES - Hook visual → Contexto → Desarrollo → CTA.`,
        calendario: `MODO ACTIVO: CALENDARIO - Sugiere fechas y frecuencia razonables.`,
        biblioteca: `MODO ACTIVO: BIBLIOTECA - Mejora textos manteniendo la esencia.`,
    };

    const modeInstruction = mode && modeGuide[mode] ? modeGuide[mode] : '';
    const userName_str = userName ? `\nHablas con: ${userName}.` : '';

    return `Eres "WRITI JARVIS", el estratega de contenido y marketer experto.${userName_str}

REGLAS ESTRICTAS:
1. CERO HUMO: NUNCA asumas logros falsos. Sé real y honesto.
2. MUY CORTO Y DIRECTO: Frases cortas, sin relleno motivacional.
3. LENGUAJE HUMANO: Habla como un colega marketer por Slack.
4. TEXTOS LISTOS PARA USAR: Sin introducciones innecesarias.
5. PROACTIVO: Ofrece siempre el siguiente paso concreto.

CONTEXTO:
${brainContext}
${modeInstruction}
IDIOMA: Responde SIEMPRE en el mismo idioma del usuario.`;
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { projectId, messages, mode, userName } = body;

        if (!messages) {
            return NextResponse.json({ error: 'Faltan datos requeridos (messages).' }, { status: 400 });
        }

        // ─────────────────────────────────────────────────────────────
        // SECURITY: Verify Session & Project Ownership (v4.9.0)
        // ─────────────────────────────────────────────────────────────
        const { user, supabase } = await getServerSession(req);
        if (!user) return unauthorized();

        if (projectId) {
            const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
            if (!hasAccess) return forbidden('No tienes permiso para acceder a este proyecto.');
        }

        const verifiedUserId = user.id;

        // Charge 1 credit per message
        const creditResult = await chargeCredits(supabase, verifiedUserId, 1, 'assistant_chat', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
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
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', verifiedUserId).single();
            brain = data;
        }

        const systemPrompt = buildJarvisSystemPrompt({ brain, userName, projectName, mode });

        const historyMessages = (messages || []).slice(-10);
        const lastMsg = historyMessages[historyMessages.length - 1];
        const userMessage = lastMsg?.content || '';

        const previousContext = historyMessages.slice(0, -1).map(m =>
            `${m.role === 'user' ? 'Usuario' : 'JARVIS'}: ${m.content}`
        ).join('\n\n');

        const fullUserMessage = previousContext
            ? `[Historial]\n${previousContext}\n\n[Mensaje actual]\n${userMessage}`
            : userMessage;

        const { content } = await improveBlockWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage: fullUserMessage,
        });

        return NextResponse.json({ reply: content || 'No pude generar respuesta.' });

    } catch (error) {
        console.error('[assistant/chat] Error:', error?.message);
        return NextResponse.json({ error: 'Error al conectar con la IA.' }, { status: 500 });
    }
}
