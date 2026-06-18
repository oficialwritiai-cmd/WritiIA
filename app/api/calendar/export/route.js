import { NextResponse } from 'next/server';
import { getServerSession, unauthorized, forbidden } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');
        
        const { user, supabase } = await getServerSession(request);
        if (!user) return unauthorized();

        // 1. Fetch Calendar Events
        let eventQuery = supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', user.id)
            .order('event_date', { ascending: true });

        if (projectId && projectId !== 'null' && projectId !== 'undefined') {
            eventQuery = eventQuery.eq('project_id', projectId);
        }

        const { data: events, error: eventsErr } = await eventQuery;
        if (eventsErr) throw eventsErr;

        // 2. Fetch Content Slots (Compatibility)
        let slotQuery = supabase
            .from('content_slots')
            .select('*')
            .eq('user_id', user.id);

        if (projectId && projectId !== 'null' && projectId !== 'undefined') {
            slotQuery = slotQuery.eq('project_id', projectId);
        }

        const { data: slots, error: slotsErr } = await slotQuery.order('day_number', { ascending: true });
        if (slotsErr) throw slotsErr;

        // 3. Generate CSV
        const headers = [
            'Fecha', 'Hora Inicio', 'Hora Fin', 'Plataforma', 'Estado', 'Título', 'Tipo', 'Notas'
        ];

        // Map calendar events
        const eventRows = (events || []).map(ev => [
            ev.event_date || '',
            ev.start_time || '',
            ev.end_time || '',
            ev.platform || 'General',
            ev.status || 'idea',
            `"${(ev.title || 'Sin título').replace(/"/g, '""')}"`,
            ev.type || 'evento',
            `"${(ev.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
        ].join(','));

        // Map content slots (if any not in events)
        const slotRows = (slots || []).map(slot => [
            slot.scheduled_date || '',
            '', // No start_time in slots
            '', // No end_time in slots
            slot.platform || 'General',
            slot.slot_status || 'idea',
            `"${(slot.idea_title || 'Sin título').replace(/"/g, '""')}"`,
            'plan_auto',
            `"${(slot.idea_description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
        ].join(','));

        const csvContent = [headers.join(','), ...eventRows, ...slotRows].join('\n');

        return new Response(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="plan-writi-ai-${projectId || 'global'}.csv"`
            }
        });

    } catch (err) {
        console.error('[calendar/export] Error:', err);
        return NextResponse.json({ error: 'Error al exportar: ' + err.message }, { status: 500 });
    }
}
