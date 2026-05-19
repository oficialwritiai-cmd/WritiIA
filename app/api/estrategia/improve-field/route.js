import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { improveBlockWithHaiku } from '@/lib/anthropic';
import { unauthorized } from '@/lib/auth-guard';
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';

export const maxDuration = 60; // Allow more time for AI generation

export async function POST(req) {
    try {
        const body = await req.json();
        const { fieldKey, currentText, instruction, brainContext } = body;

        const cookieStore = cookies();
        const sessionSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { cookies: { get: (n) => cookieStore.get(n)?.value } }
        );
        const { data: { user } } = await sessionSupabase.auth.getUser();
        if (!user) return unauthorized();
        const verifiedUserId = user.id;

        if (!currentText) {
            return NextResponse.json({ error: 'Falta el texto actual.' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Charge credits
        const creditResult = await chargeCredits(sessionSupabase, verifiedUserId, CREDIT_COSTS.POLISH, 'improve_strategy_field');
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        // Build the prompt customized for the field type
        let fieldGoal = '';
        switch (fieldKey) {
            case 'objective':
                fieldGoal = 'Mejorar y profesionalizar el objetivo estratégico a 30 días. Haz que suene a un hito SMART (Específico, Medible, Alcanzable, Relevante, Temporal) y orientado a resultados de marketing.';
                break;
            case 'launch':
                fieldGoal = 'Clarificar y darle fuerza atractiva al lanzamiento u oferta próxima. Resaltar qué se lanza y generar emoción, manteniéndolo realista.';
                break;
            case 'objection':
                fieldGoal = 'Reescribir la objeción del cliente para que sea concisa. Extraer el verdadero dolor o impedimento (ej: "Es muy caro" -> "Falta de liquidez o percepción de bajo valor respecto al precio").';
                break;
            default:
                fieldGoal = 'Mejorar redacción, claridad y coherencia general para una estrategia de contenido.';
        }

        const systemMessage = `
Eres un Estratega Experto de Marketing. Tu tarea es MEJORAR EXCLUSIVAMENTE un dato clave de la "Sesión de Descubrimiento" de la marca.
NO debes crear un post ni contenido público. Estás resumiendo ideas para la planificación interna del proyecto de marketing.

OBJETIVO ESPECÍFICO PARA ESTE CAMPO:
${fieldGoal}

REGLAS ESTRICTAS:
1. NO inventes cosas nuevas. Limítate a refinar, potenciar y profesionalizar la información aportada por el usuario.
2. Mantén la esencia y significado original.
3. El resultado debe ser texto directo para ser pegado en una caja de formulario de planificación estratégica (sin preámbulos, no escribas "Aquí tienes...", ni uses comillas).
4. ${instruction ? `INSTRUCCIÓN ESPECÍFICA DEL USUARIO (Prioridad Máxima): ${instruction}` : `No hay instrucciones extra, aplica la optimización experta por defecto.`}

CONTEXTO DEL CEREBRO DE LA MARCA (Opcional, úsalo para orientar el tono, pero no incluyas estos datos en tu respuesta):
${brainContext ? JSON.stringify(brainContext, null, 2) : 'No especificado.'}
`;

        const userMessage = `TEXTO ACTUAL A MEJORAR:\n${currentText}`;

        // Call Anthropic API
        const { content: improvedText } = await improveBlockWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt: systemMessage,
            userMessage: userMessage,
        });

        return NextResponse.json({ improvedText: improvedText.trim() });

    } catch (error) {
        console.error('Error in improve-strategy-field:', error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
