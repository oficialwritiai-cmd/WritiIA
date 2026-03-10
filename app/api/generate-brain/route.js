import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIdeasWithHaiku } from '@/lib/anthropic'; // We can use this or create a generic one. improveBlockWithHaiku also works but generateIdeasWithHaiku gives more token output room.
import { chargeCredits, CREDIT_COSTS } from '@/lib/credits';

export const maxDuration = 60;

export async function POST(req) {
    try {
        const body = await req.json();
        const { answers, userId, projectId } = body;

        if (!answers || !userId || !projectId) {
            return NextResponse.json({ error: 'Faltan datos requeridos (answers, userId, projectId).' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Charge 2 credits for a full brain generation
        const creditResult = await chargeCredits(supabase, userId, 2, 'generate_brain', projectId);
        if (!creditResult.success) {
            return NextResponse.json({ error: 'Créditos insuficientes.', code: 'NO_CREDITS' }, { status: 402 });
        }

        const systemMessage = `
Eres un Experto Estratega de Marketing y Copywriter de respuesta directa.
Tu tarea es tomar las respuestas de un usuario sobre su negocio y construir el "Cerebro IA" ("Knowledge Base") completo de su proyecto.

DEBES DEVOLVER ESTRICTAMENTE UN OBJETO JSON VÁLIDO CON LAS SIGUIENTES 7 CLAVES EXACTAS:
{
  "biography": "Su historia, quién es y qué hace, reescrito de forma atractiva y profesional.",
  "audience": "Descripción clara de su cliente ideal, sus problemas y deseos.",
  "products_services": "Lista clara de qué vende y qué resultados da.",
  "niche_topics": "Nicho principal y pilares de contenido (temas de los que hablará).",
  "values_tone": "El tono de voz de su marca y los valores que transmite.",
  "style_words": "Lista de palabras o frases clave que definen su estilo, separadas por comas.",
  "knowledge_raw": "Base de conocimiento. IMPORTANTE: Aquí DEBES incluir explícitamente 1 a 3 'Ofertas Irresistibles' usando la fórmula: [Ayudo a X] a conseguir [Resultado] en [Tiempo] sin [Dolor]. Además, incluye ejemplos de mensajes o ángulos útiles para ventas."
}

REGLAS:
1. NO inventes cosas que no tengan relación con sus respuestas. Amplía y mejora profesionalmente su texto basándote en lo que han dicho.
2. Escribe en segunda o tercera persona según encaje mejor, pero mantén consistencia. (Ej: "Ayudo a..." o "La marca ayuda a..."). Mejor redactar como si el propio Cerebro estuviera configurado en primera persona para que la IA actúe como ellos.
3. Si alguna respuesta falta, infiere lo más lógico para su nicho o deja el campo genérico pero útil.
4. DEVUELVE ÚNICAMENTE EL JSON. Nada de texto antes ni después.
        `;

        const userMessage = `
RESPUESTAS DEL USUARIO:
1. Negocio y Biografía: ${answers.step1 || 'No especificado'}
2. Público Objetivo: ${answers.step2 || 'No especificado'}
3. Productos y Nicho: ${answers.step3 || 'No especificado'}
4. Estilo y Valores: ${answers.step4 || 'No especificado'}
5. Oferta Irresistible: ${answers.step5 || 'No especificado'}
        `;

        // We use generateIdeasWithHaiku from lib/anthropic because it's configured for JSON parsing and larger token outputs
        const { parsed, content } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt: systemMessage,
            userMessage: userMessage,
        });

        // The response should be a JSON object, but our parser sometimes wraps in an array if it tries to fix it.
        // Let's ensure we extract the object.
        let generatedBrain = {};

        if (Array.isArray(parsed) && parsed.length > 0) {
            generatedBrain = parsed[0];
        } else if (parsed && typeof parsed === 'object') {
            generatedBrain = parsed;
        } else {
            console.error("AI did not return valid JSON for Brain mapping:", content);
            throw new Error("El formato devuelto por la IA no es válido.");
        }

        // Clean up formatting
        const finalBrain = {
            biography: generatedBrain.biography || generatedBrain.Biografía || generatedBrain.biografia || '',
            audience: generatedBrain.audience || generatedBrain.Público || generatedBrain.publico || '',
            products_services: generatedBrain.products_services || generatedBrain.Productos || generatedBrain.productos || '',
            niche_topics: generatedBrain.niche_topics || generatedBrain.Nicho || generatedBrain.nicho || '',
            values_tone: generatedBrain.values_tone || generatedBrain.Valores || generatedBrain.valores || '',
            style_words: generatedBrain.style_words || generatedBrain.Estilo || generatedBrain.estilo || '',
            knowledge_raw: generatedBrain.knowledge_raw || generatedBrain.Base || generatedBrain.base_conocimiento || ''
        };

        return NextResponse.json({ brain: finalBrain });

    } catch (error) {
        console.error('Error generating brain:', error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
