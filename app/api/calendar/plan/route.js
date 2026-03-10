import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateIdeasWithHaiku } from '@/lib/anthropic';

export async function POST(request) {
    try {
        const { items, userId, projectId } = await request.json();

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'No se seleccionaron ítems para planificar.' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch Brand Brain: project-scoped first, fallback to global
        let brandBrain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', userId).single();
            brandBrain = data;
        }

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const endOfMonthStr = endOfMonth.toISOString().split('T')[0];

        const { data: existingEvents } = await supabase
            .from('calendar_events')
            .select('event_date, type, platform')
            .eq('user_id', userId)
            .gte('event_date', todayStr)
            .lte('event_date', endOfMonthStr);

        const eventsByDate = {};
        if (existingEvents) {
            existingEvents.forEach(ev => {
                if (!eventsByDate[ev.event_date]) eventsByDate[ev.event_date] = [];
                eventsByDate[ev.event_date].push(ev);
            });
        }

        const systemPrompt = `Eres un experto en estrategia de contenido y calendarización inteligente.
Tu tarea es asignar a cada ítem un DÍA y una HORA óptima de publicación, distribuyéndolos a lo largo del mes.

REGLAS OBLIGATORIAS:
1. YouTube: 1-2 veces por semana (días laborales, martes-jueves ideal)
2. Instagram/TikTok: distribuir 2-4 veces por semana, evitar fines de semana si es posible
3. LinkedIn: días laborales, martes-miércoles-jueves
4. X (Twitter): cualquier día

REGLAS DE DISTRIBUCIÓN ESTRICTA:
- MÁXIMO 2 publicaciones por día
- NO pongas más de 2 ideas el mismo día
- Distribuye las ideas a lo largo del mes (del ${todayStr} al ${endOfMonthStr})
- Si ya hay eventos en cierta fecha, elige otra fecha libre
- Alternar tipos de contenido (no poner todo viral el mismo día)

CALENDARIO EXISTENTE:
${Object.entries(eventsByDate).map(([date, events]) => 
    `${date}: ${events.length} eventos (${events.map(e => e.type).join(', ')})`
).join('\n') || 'No hay eventos programados este mes.'}

Responde ÚNICAMENTE con un array JSON válido con este formato:
[
  {
    "id_idea": "ID_ORIGINAL_DEL_ITEM",
    "fecha_sugerida": "YYYY-MM-DD",
    "hora_sugerida": "HH:mm",
    "motivo": "Breve explicación"
  }
]
No añadas texto antes ni después del JSON.`;

const userMessage = `
FECHA ACTUAL (HOY): ${todayStr}
FIN DE MES: ${endOfMonthStr}
INSTRUCCIÓN VITAL: Todas las "fecha_sugerida" DEBEN ser en el año ${new Date().getFullYear()} y a partir de la fecha de hoy. NO planifiques NADA en el pasado.

IMPORTANTE: 
- No pongas más de 2 ideas en el mismo día
- Distribuye las ideas a lo largo del mes uniformemente
- Evita los días que ya tienen eventos

PERFIL: ${brandBrain?.biography || 'Creador de contenido'}
ÍTEMS A PLANIFICAR:
${items.map(it => `- [ID: ${it.id}] ${it.titulo || it.content?.titulo_idea || it.titulo_idea || 'Sin título'} (${it.platform || it.plataforma})`).join('\n')}

Genera la planificación óptima distribuyendo las ideas a lo largo del mes.`;


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
