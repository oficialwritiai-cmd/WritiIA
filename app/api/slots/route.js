import { NextResponse } from 'next/server';
import { getServerSession, unauthorized } from '@/lib/auth-guard';

export async function PUT(request) {
    try {
        const { user, supabase } = await getServerSession(request);
        if (!user) return unauthorized();

        const body = await request.json();
        const { slot_id, scheduled_date, color } = body;

        if (!slot_id) {
            return NextResponse.json({ error: 'slot_id es requerido.' }, { status: 400 });
        }

        // Verify slot belongs to user
        const { data: slot } = await supabase
            .from('content_slots')
            .select('id, user_id')
            .eq('id', slot_id)
            .single();

        if (!slot || slot.user_id !== user.id) {
            return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
        }

        // Update slot with scheduled_date and color
        const updateData = {};
        if (scheduled_date) updateData.scheduled_date = scheduled_date;
        if (color) updateData.slot_color = color; // Usar slot_color si existe, sino 'color'

        const { error: updateErr } = await supabase
            .from('content_slots')
            .update(updateData)
            .eq('id', slot_id);

        if (updateErr) throw updateErr;

        return NextResponse.json({ ok: true, slot_id, ...updateData });

    } catch (error) {
        console.error('[slots] Error:', error?.message);
        return NextResponse.json({ error: 'Error al actualizar slot.' }, { status: 500 });
    }
}
