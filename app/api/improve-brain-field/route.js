import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const maxDuration = 60; // Allow more time for AI generation

export async function POST(req) {
    try {
        const body = await req.json();
        const { fieldKey, currentText, instruction, brainContext } = body;

        if (!currentText) {
            return NextResponse.json({ error: 'Falta el texto actual.' }, { status: 400 });
        }

        // 1. Validate session
        const supabase = createSupabaseServerClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = session.user.id;

        // 2. Charge credits (assuming 1 credit for an improvement)
        const { data: profile, error: profileError } = await supabase
            .from('users_profiles')
            .select('credits_balance, plan, trial_active')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Error obteniendo perfil.' }, { status: 500 });
        }

        const isPro = profile.plan === 'pro' || profile.trial_active;
        if (!isPro && profile.credits_balance < 1) {
            return NextResponse.json({ error: 'Créditos insuficientes.' }, { status: 402 });
        }

        // 3. Build the prompt customized for the field type
        let fieldGoal = '';
        switch (fieldKey) {
            case 'biography':
                fieldGoal = 'Mejorar como biografía de marca/emprendedor. Mantener hechos y trayectoria, pero hacerla más clara, atractiva y coherente. Proponer estructura si es necesario (quién eres, a quién ayudas, cómo lo haces).';
                break;
            case 'audience':
                fieldGoal = 'Analizar el texto actual y devolver una descripción más clara del avatar (quién es, qué problemas tiene, qué desea, cómo habla). No inventar un público nuevo; refinar el que ya está escrito.';
                break;
            case 'values_tone':
                fieldGoal = 'Enfocarse en valores clave y tono de voz. Devolver una lista corta + un párrafo que describa cómo se debe sentir el contenido.';
                break;
            case 'niche_topics':
                fieldGoal = 'Organizar los temas en categorías claras. Quitar repeticiones y hacer que se vea como lista de pilares de contenido.';
                break;
            case 'products_services':
                fieldGoal = 'Convertir los textos en descripciones claras de ofertas (qué es, para quién es, qué resultado da). Mantener nombres reales, solo clarificar y ordenar.';
                break;
            case 'style_words':
                fieldGoal = 'Limpiar y organizar en lista de palabras/frases guía del estilo. Evitar párrafos largos; devolver una lista separada por comas o bullets concisos.';
                break;
            case 'knowledge_raw':
                fieldGoal = 'Tratar este campo como referencia de la marca. Mantener ejemplos, expresiones propias, frases típicas. Solo ordenar, resumir y hacer más legible sin perder la esencia.';
                break;
            default:
                fieldGoal = 'Mejorar redacción, claridad, estructura y coherencia general.';
        }

        const systemMessage = `
Eres el experto en copy de la marca. Tu tarea es MEJORAR EXCLUSIVAMENTE el campo de configuración "${fieldKey}".
NO debes crear un post ni un texto final de contenido, sino configurar los metadatos y pautas del proyecto.

OBJETIVO ESPECÍFICO PARA ESTE CAMPO:
${fieldGoal}

REGLAS ESTRICTAS:
1. NO inventes un negocio nuevo, público o productos. Limítate a refinar lo aportado.
2. Mantén la esencia y significado original. Solo reescribe, ordena y mejora su claridad y profesionalismo.
3. El resultado debe ser texto directo para ser pegado en la caja de configuración (no uses frases como "Aquí tienes la versión mejorada:").
4. ${instruction ? `INSTRUCCIÓN ESPECÍFICA DEL USUARIO (Prioridad Máxima): ${instruction}` : `No hay instrucciones extra, aplica la optimización por defecto.`}

CONTEXTO DEL CEREBRO DE LA MARCA (Usa esto para entender el estilo y alinear el resultado, pero NO devuelvas estos datos):
${JSON.stringify(brainContext, null, 2)}
`;

        const userMessage = `TEXTO ACTUAL A MEJORAR:\n${currentText}`;

        // 4. Call OpenAI API
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.5,
            }),
        });

        if (!oaiRes.ok) {
            const errBody = await oaiRes.text();
            console.error("OpenAI error body:", errBody);
            throw new Error(`Error llamando a OpenAI: ${oaiRes.status}`);
        }

        const oaiData = await oaiRes.json();
        const improvedText = oaiData.choices[0].message.content.trim();

        // 5. Deduct credit if not Pro
        if (!isPro) {
            const { error: deductError } = await supabase.rpc('deduct_credit', { user_id: userId, amount: 1 });
            if (deductError) console.error("Error deducting credit:", deductError);
        }

        return NextResponse.json({ improvedText });

    } catch (error) {
        console.error('Error in improve-brain-field:', error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
