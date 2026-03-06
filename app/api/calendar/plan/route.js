import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIdeasWithHaiku } from '@/lib/anthropic';

export async function POST(request) {
    try {
        const { items, userId } = await request.json();

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'No se seleccionaron ítems para planificar.' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: brandBrain } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();

        const systemPrompt = `Eres un experto en estrategia de contenido y calendarización.
Tengo una lista de ideas/guiones que quiero agendar en mi calendario de contenidos.
Tu tarea es asignar a cada ítem un DÍA y una HORA óptima de publicación, proyectando a partir de hoy o el rango de fechas implícito en el mes actual.

REGLAS:
1. Distribuye los contenidos de forma lógica (ej: no pongas 5 el mismo día, a menos que se pidan muy juntos).
2. Sugiere horas basadas en el tipo de contenido (mañana para educativo, tarde/noche para viral/entretenimiento).
3. Responde ÚNICAMENTE con un array JSON estrictamente con este formato:
[
  {
    "id_idea": "ID_ORIGINAL_DEL_ITEM",
    "fecha_sugerida": "YYYY-MM-DD",
    "hora_sugerida": "HH:mm",
    "motivo": "Breve explicación de por qué este momento"
  }
]
No añadas texto antes ni después del JSON.`;

        const todayStr = new Date().toISOString().split('T')[0];

        const userMessage = `
FECHA ACTUAL (HOY): ${todayStr}
INSTRUCCIÓN VITAL: Todas las "fecha_sugerida" DEBEN ser en el año ${new Date().getFullYear()} y a partir de la fecha de hoy. NO planifiques NADA en el pasado.

PERFIL: ${brandBrain?.biography || 'Creador de contenido'}
ÍTEMS A PLANIFICAR:
${items.map(it => `- [ID: ${it.id}] ${it.titulo || it.content?.titulo_idea || 'Sin título'} (${it.platform})`).join('\n')}

Genera la planificación óptima para estos contenidos asegurando que "fecha_sugerida" sea posterior o igual a ${todayStr}.`;

        console.log(`[CALENDARIO] Solicitando plan inteligente para ${items.length} ítems desde ${todayStr}`);

        const { parsed: schedule } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        if (schedule) {
            schedule.forEach(s => {
                console.log(`[CALENDARIO] IA sugiere fecha ${s.fecha} para ítem ${s.id}`);
            });
        }

        return NextResponse.json({ schedule });
    } catch (err) {
        console.error('Error en /api/calendar/plan:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
