// app/api/projects/[project_id]/export/route.js
// Export Monthly Plan (Ideas + Scripts) to CSV for Google Sheets/Excel
// Version: v4.9.0

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request, { params }) {
    const { project_id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId || !project_id) {
        return NextResponse.json({ error: 'Faltan parámetros (userId/project_id)' }, { status: 400 });
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Fetch all slots for this project
        const { data: slots, error: slotsErr } = await supabase
            .from('content_slots')
            .select('*')
            .eq('project_id', project_id)
            .eq('user_id', userId)
            .order('day_number', { ascending: true });

        if (slotsErr) throw slotsErr;

        // 2. Fetch all scripts for these slots to get full details
        const { data: scripts, error: scriptsErr } = await supabase
            .from('scripts')
            .select('*')
            .eq('project_id', project_id)
            .eq('user_id', userId);

        if (scriptsErr) throw scriptsErr;

        // Map scripts by ID for easy access
        const scriptsMap = {};
        (scripts || []).forEach(s => {
            scriptsMap[s.id] = s;
        });

        // 3. Generate CSV
        const headers = [
            'Día',
            'Fecha',
            'Plataforma',
            'Estado',
            'Título/Idea',
            'Objetivo',
            'Hook/Gancho',
            'Estructura/Guion',
            'CTA',
            'Post Copy',
            'Notas'
        ];

        const rows = (slots || []).map(slot => {
            const script = slot.script_id ? scriptsMap[slot.script_id] : null;
            
            // Clean strings for CSV (remove newlines, escape quotes)
            const clean = (val) => {
                if (!val) return '';
                let str = String(val);
                // Si es un objeto (como structure o post_copy), lo aplanamos a texto
                if (typeof val === 'object') {
                    if (Array.isArray(val)) {
                        str = val.map(item => item.point ? `${item.point}: ${item.detail}` : item).join(' | ');
                    } else {
                        str = JSON.stringify(val);
                    }
                }
                return `"${str.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
            };

            const structureText = script?.structure 
                ? (Array.isArray(script.structure) ? script.structure.map((s, i) => `${i+1}. ${s.point}: ${s.detail}`).join(' ') : script.structure)
                : (slot.script_data?.desarrollo ? (Array.isArray(slot.script_data.desarrollo) ? slot.script_data.desarrollo.join(' ') : slot.script_data.desarrollo) : '');

            const postCopyText = script?.post_copy
                ? `${script.post_copy.headline || ''} | ${script.post_copy.body || ''} | ${(script.post_copy.hashtags || []).join(' ')}`
                : (slot.script_data?.copy_post ? `${slot.script_data.copy_post.headline || ''} | ${slot.script_data.copy_post.body || ''}` : '');

            return [
                slot.day_number || '',
                slot.scheduled_date || '',
                slot.platform || '',
                slot.slot_status || 'idea_only',
                clean(slot.idea_title),
                clean(slot.goal),
                clean(script?.hook || slot.script_data?.hook || ''),
                clean(structureText),
                clean(script?.cta || slot.script_data?.cta || ''),
                clean(postCopyText),
                clean(script?.notes || slot.script_data?.notes || '')
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');

        // 4. Return as downloadable file
        return new Response(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="plan-mensual-writi-${project_id.substring(0,8)}.csv"`
            }
        });

    } catch (err) {
        console.error('[export/route] Error:', err);
        return NextResponse.json({ error: 'Error al exportar el plan.' }, { status: 500 });
    }
}
