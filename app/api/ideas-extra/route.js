import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIdeasWithHaiku } from '@/lib/anthropic';

export async function POST(request) {
    try {
        const { context, experienceLevel, productTicket, objections, examples, userId } = await request.json();

        if (!context || !context.trim()) {
            return NextResponse.json({ error: 'Escribe qué quieres este mes.' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();

        const systemPrompt = `Eres un generador de ideas de contenido viral para redes sociales.
Tu tarea es crear ideas originales, específicas y accionables basadas en la descripción del usuario.

REGLAS:
1. Las ideas deben ser ÚNICAS y específicas, nada de genéricas.
2. Cada idea debe tener: título, descripción detallada, plataforma sugerida, tipo de contenido, y objetivo.
3. Evita clichés como "X tips para..." o "Cómo hacer X en Y días".
4. Enfócate en temas controversiales, preguntas frecuentes, errores comunes, o historias personales impactantes.
5. Responde ÚNICAMENTE con un array JSON con este formato:
[
  {
    "titulo_idea": "Título catchy y específico",
    "descripcion": "Descripción de 2-3 oraciones explicando el contenido",
    "plataforma": "Reels/TikTok/LinkedIn",
    "tipo_contenido": "autoridad/historia/venta/comunidad",
    "objetivo": "atraer leads/ventas/engagement/autoridad"
  }
]
No añadas texto antes ni después del JSON.`;

        let userMessage = `CONTEXTO: ${context}`;
        
        if (experienceLevel) {
            userMessage += `\n\nNIVEL DE EXPERIENCIA DEL PÚBLICO: ${experienceLevel}`;
        }
        if (productTicket) {
            userMessage += `\n\nTICKET/PRECIO DEL PRODUCTO: ${productTicket}`;
        }
        if (objections) {
            userMessage += `\n\nOBJECIONES CLAVE A ABORDAR: ${objections}`;
        }
        if (examples) {
            userMessage += `\n\nEJEMPLOS DE CONTENIDO QUE LE GUSTAN: ${examples}`;
        }
        
        userMessage += `\n\nGenera 6-10 ideas originales y específicas para contenido de este mes.`;

        const { parsed: ideas, error: parseError } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        if (parseError) {
            console.error('[Ideas Extra] Parse error:', parseError);
            return NextResponse.json({ error: 'Error al generar ideas. Intenta de nuevo.' }, { status: 500 });
        }

        const validIdeas = Array.isArray(ideas) ? ideas.filter(i => i.titulo_idea && i.descripcion) : [];

        return NextResponse.json({ ideas: validIdeas });

    } catch (err) {
        console.error('Error en /api/ideas-extra:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
