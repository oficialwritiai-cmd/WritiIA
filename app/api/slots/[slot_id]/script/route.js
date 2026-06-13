// app/api/slots/[slot_id]/script/route.js
// GET: Retrieve the generated script for a slot (Plan Mensual v2)
// PUT: Update/edit an existing script

import { NextResponse } from 'next/server';
import { getServerSession, unauthorized } from '@/lib/auth-guard';

export async function GET(request, { params }) {
    const { slot_id } = params;

    // SECURITY: verify JWT — never trust userId from the query string
    const { user, supabase } = await getServerSession(request);
    if (!user) return unauthorized();
    const userId = user.id;

    // Fetch the slot with its linked script
    const { data: slot, error: slotErr } = await supabase
        .from('content_slots')
        .select('*, scripts(*)')
        .eq('id', slot_id)
        .eq('user_id', userId)
        .single();

    if (slotErr || !slot) {
        return NextResponse.json({ error: 'Slot no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
        slot_status: slot.slot_status || (slot.has_script ? 'script_ready' : 'idea_only'),
        slot: {
            id: slot.id,
            title: slot.idea_title,
            description: slot.idea_description,
            platform: slot.platform,
            content_type: slot.content_type,
            goal: slot.goal,
            scheduled_date: slot.scheduled_date,
        },
        script: slot.scripts || null,
    });
}

export async function PUT(request, { params }) {
    const { slot_id } = params;

    // SECURITY: verify JWT — never trust userId from the body
    const { user, supabase } = await getServerSession(request);
    if (!user) return unauthorized();
    const userId = user.id;

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
    }

    const { scriptId, title, hook, structure, cta, notes, post_copy } = body;
    if (!scriptId) {
        return NextResponse.json({ error: 'scriptId es requerido.' }, { status: 400 });
    }

    // Verify script belongs to user via slot
    const { data: slot } = await supabase
        .from('content_slots')
        .select('id')
        .eq('id', slot_id)
        .eq('user_id', userId)
        .single();

    if (!slot) {
        return NextResponse.json({ error: 'Sin permisos para editar este guion.' }, { status: 403 });
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (hook !== undefined) { updates.hook = hook; updates.gancho = hook; }
    if (structure !== undefined) updates.structure = structure;
    if (cta !== undefined) { updates.cta = cta; }
    if (notes !== undefined) updates.notes = notes;
    if (post_copy !== undefined) updates.post_copy = post_copy;
    updates.updated_at = new Date().toISOString();

    // Rebuild full content text
    if (title || hook || structure || cta) {
        updates.content = [
            `TÍTULO: ${title || ''}`,
            '',
            '🎯 HOOK',
            hook || '',
            '',
            '📝 ESTRUCTURA',
            ...(Array.isArray(structure) ? structure.map((p, i) => `${i + 1}. ${p.point}: ${p.detail}`) : []),
            '',
            '🔥 CTA',
            cta || '',
        ].join('\n');
    }

    const { error } = await supabase
        .from('scripts')
        .update(updates)
        .eq('id', scriptId);

    if (error) {
        return NextResponse.json({ error: 'Error al actualizar el guion.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
