import { NextResponse } from 'next/server';
import { getServerSession, verifyProjectAccess, unauthorized, forbidden } from '@/lib/auth-guard';
import { generateIdeasWithHaiku } from '@/lib/anthropic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { items, projectId } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'No se seleccionaron ítems para planificar.' }, { status: 400 });
        }

        // ─────────────────────────────────────────────────────────────
        // SECURITY: Verify Session & Project Ownership (v4.9.0)
        // ─────────────────────────────────────────────────────────────
        const { user, supabase } = await getServerSession(request);
        if (!user) return unauthorized();

        if (projectId) {
            const hasAccess = await verifyProjectAccess(supabase, projectId, user.id);
            if (!hasAccess) return forbidden('No tienes permiso para acceder a este proyecto.');
        }

        const verifiedUserId = user.id;

        // Fetch Brand Brain
        let brandBrain = null;
        if (projectId) {
            const { data } = await supabase.from('project_brains').select('*').eq('project_id', projectId).single();
            brandBrain = data;
        }
        if (!brandBrain) {
            const { data } = await supabase.from('brand_brain').select('*').eq('user_id', verifiedUserId).single();
            brandBrain = data;
        }

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const endOfMonthStr = endOfMonth.toISOString().split('T')[0];

        let eventsQuery = supabase
            .from('calendar_events')
            .select('event_date, type, platform')
            .eq('user_id', verifiedUserId)
            .gte('event_date', todayStr)
            .lte('event_date', endOfMonthStr);
        if (projectId) eventsQuery = eventsQuery.eq('project_id', projectId);
        const { data: existingEvents } = await eventsQuery;

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
1. YouTube: 1-2 veces por semana (días laborales).
2. Instagram/TikTok: 2-4 veces por semana.
3. LinkedIn: días laborales.

REGLAS DE DISTRIBUCIÓN:
- MÁXIMO 2 publicaciones por día.
- Distribución uniforme del ${todayStr} al ${endOfMonthStr}.
- Evitar fechas con eventos ya programados.

CALENDARIO EXISTENTE:
${Object.entries(eventsByDate).map(([date, events]) => 
    `${date}: ${events.length} eventos`
).join('\n') || 'Sin eventos.'}

Responde ÚNICAMENTE con un array JSON válido:
[
  {
    "id_idea": "ID_ORIGINAL",
    "fecha_sugerida": "YYYY-MM-DD",
    "hora_sugerida": "HH:mm",
    "motivo": "..."
  }
]`;

        const userMessage = `
Planifica ${items.length} ítems. Biografía: ${brandBrain?.biography || ''}.
ÍTEMS:
${items.map(it => `- [ID: ${it.id}] ${it.titulo || it.titulo_idea || 'Sin título'} (${it.platform || 'General'})`).join('\n')}
`;

        const { parsed: schedule } = await generateIdeasWithHaiku({
            apiKey: process.env.ANTHROPIC_API_KEY,
            systemPrompt,
            userMessage,
        });

        return NextResponse.json({ schedule });
    } catch (err) {
        console.error('[calendar/plan] Error:', err?.message);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
