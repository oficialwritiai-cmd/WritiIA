import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    try {
        const { description, platforms, frequency, focus, tone, context, userId } = await request.json();

        if (!description || !platforms || !frequency || !focus || !tone) {
            return NextResponse.json(
                { error: 'Faltan campos obligatorios para generar el plan mensual.' },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (!userId) {
            return NextResponse.json({ error: 'No se detectó sesión de usuario.' }, { status: 401 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey || apiKey === 'placeholder-anthropic-key') {
            return NextResponse.json(
                { error: 'La API Key central de Claude no está configurada.' },
                { status: 500 }
            );
        }

        let brandContextString = '';

        // Fetch Brand Brain
        const { data: brandBrain } = await supabase
            .from('brand_brain')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (brandBrain) {
            const knowledgeRaw = brandBrain.knowledge_raw || '';
            const trimmedKnowledge = knowledgeRaw.length > 5000
                ? knowledgeRaw.substring(0, 5000) + '... [Trunkated]'
                : knowledgeRaw;

            brandContextString = `
CONTEXTO DE MARCA DEL USUARIO (Cerebro IA):
- Biografía/Historia: ${brandBrain.biography || ''}
- Audiencia Objetivo: ${brandBrain.audience || ''}
- Valores y Tono: ${brandBrain.values_tone || ''}
- Nicho y Temas: ${brandBrain.niche_topics || ''}
- Conocimiento Extra: ${trimmedKnowledge}
`;
        }

        // Determinar cantidad de posts
        let postCount = 12; // 3/semana default
        if (frequency === '4 publicaciones por semana') postCount = 16;
        if (frequency === '5 publicaciones por semana') postCount = 20;
        if (frequency === '7 publicaciones por semana') postCount = 28;

        const systemPrompt = `Eres un estratega experto en contenido de redes sociales en español.

Tienes el CONTEXTO DE MARCA del usuario y detalles de lo que quiere conseguir este mes.

Tu tarea: diseñar un PLAN DE CONTENIDO para 30 días.

Datos de la campaña del usuario:
- Descripción/Objetivo global: ${description}
- Plataformas a usar: ${platforms.join(', ')}
- Enfoque principal: ${focus}
- Tono: ${tone}
- Contexto extra o campañas específicas: ${context || 'Ninguno'}

Reglas:
- Usa el contexto de marca para que los temas tengan sentido con la persona y su negocio.
- Distribuye el contenido para tener exactamente ${postCount} publicaciones en el mes (frecuencia: ${frequency}).
- Usa SOLO las plataformas seleccionadas.
- Mezcla formatos (errores, historias, listas, tips, casos de éxito, objeciones, bastidores, etc.) según el enfoque de: ${focus}.
- Asegúrate de que los temas no se repiten de forma aburrida y evolucionan.
- El resultado NO son guiones completos, solo ideas bien definidas listas para guionizar.

${brandContextString}

Responde SOLO con JSON válido con esta estructura:
[
  {
    "dia": 1,
    "plataforma": "Reels",
    "tipo_contenido": "Error común / Lista / Historia / Caso de éxito / etc.",
    "titulo_idea": "Título o idea concreta del contenido",
    "objetivo": "seguidores / ventas / autoridad / engagement"
  }
]

Asegúrate de que la longitud del array sea exactamente de ${postCount} posts. Los días deben ser valores como 1, 3, 5, etc., simulando la distribución en el mes.
No devuelvas explicaciones, ni Markdown de código, solo el array de JSON puro.`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 4096,
                temperature: 0.7,
                messages: [{ role: 'user', content: systemPrompt }],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Error de Anthropic API');
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || '';
        const jsonMatch = content.match(/\[[\s\S]*\]/);

        let results = [];
        try {
            results = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch (e) {
            throw new Error("Error al analizar la respuesta JSON de Claude.");
        }

        // Log usage
        const inTokens = data.usage?.input_tokens || 0;
        const outTokens = data.usage?.output_tokens || 0;
        const totalTokens = data.usage?.total_tokens || 0;
        const estimatedCost = ((inTokens * 3 / 1000000) + (outTokens * 15 / 1000000)) * 0.95;

        await supabase.from('usage_logs').insert({
            user_id: userId,
            action: 'generate_plan',
            tokens_used: totalTokens,
            cost_eur: estimatedCost
        });

        // Insert into database
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const { data: planData, error: planError } = await supabase.from('content_plans').insert({
            user_id: userId,
            month,
            year,
            frequency,
            platforms,
            focus
        }).select().single();

        if (planError) throw new Error("Error guardando el plan en DB");

        const planId = planData.id;

        const slotsToInsert = results.map(r => ({
            plan_id: planId,
            user_id: userId,
            day_number: Number(r.dia) || 1,
            platform: r.plataforma,
            content_type: r.tipo_contenido,
            idea_title: r.titulo_idea,
            goal: r.objetivo,
            has_script: false
        }));

        const { data: slotData, error: slotError } = await supabase.from('content_slots').insert(slotsToInsert).select();
        if (slotError) throw new Error("Error guardando los slots en DB");

        return NextResponse.json({ plan: planData, slots: slotData });
    } catch (err) {
        console.error('Error del servidor:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
