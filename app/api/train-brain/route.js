import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateWithSonnet } from '@/lib/anthropic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { feedback, scriptContext, projectId, userId, type } = body;

        if (!projectId || !feedback) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 1. Fetch current brain
        const { data: brainData } = await supabase
            .from('project_brains')
            .select('learning_notes, niche, sub_niche')
            .eq('project_id', projectId)
            .single();

        const currentNotes = brainData?.learning_notes || '';

        // 2. Use AI to distill feedback into the brain
        const systemPrompt = `Eres un experto en entrenamiento de IAs y consultor de marca. 
Tu tarea es analizar un nuevo feedback del usuario sobre un guion/vdeo y RE-ESCRIBIR el "Log de Aprendizaje" del proyecto.

LOG DE APRENDIZAJE ACTUAL:
"${currentNotes}"

NUEVO FEEDBACK DEL USUARIO (${type}):
"${feedback}"

CONTEXTO DEL GUION ORIGINAL:
"${scriptContext}"

INSTRUCCIONES:
1. Extrae solo las lecciones accionables (qué evitar, qué enfatizar, qué tono usar).
2. Mantén el log CONCISO (máx 300 palabras).
3. NO repitas información si ya está en el log, cámbiala o refuérzala.
4. Responde ÚNICAMENTE con el nuevo texto del LOG DE APRENDIZAJE completo y actualizado. 
5. Si el feedback es "Me gusta", refuerza los puntos clave de ese guion. Si es "No me gusta", extrae lo que falló según el comentario.`;

        const { text: newNotes } = await generateWithSonnet({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage: `Actualiza el log de aprendizaje con este nuevo feedback.`
        });

        // 3. Update the brain
        const { error: updateError } = await supabase
            .from('project_brains')
            .update({ 
                learning_notes: newNotes,
                last_trained_at: new Date().toISOString()
            })
            .eq('project_id', projectId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, newNotes });

    } catch (err) {
        console.error('[train-brain] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
