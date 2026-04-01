import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateWithSonnet } from '@/lib/anthropic';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';

export async function POST(request) {
    try {
        const body = await request.json();
        const { feedback, scriptContext, projectId, type } = body;

        if (!projectId || !feedback) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        // SECURITY: Verify session — never trust userId from body
        const { user, supabase } = await getServerSession(request);
        if (!user) return unauthorized();

        // SECURITY: Verify the project belongs to the authenticated user
        const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
        if (!hasAccess) return forbidden();

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
