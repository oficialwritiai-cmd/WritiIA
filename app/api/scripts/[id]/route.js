import { createSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * API Scripts Handler - v6.2.0 (Deep Fix)
 * Handles GET (fetch fresh) and PATCH (partial update) for single scripts with audit logs.
 */

const supabase = createSupabaseClient();

export async function GET(req, { params }) {
    const { id } = params;
    console.log('📡 [BACKEND] GET SCRIPT:', id);
    try {
        const { data, error } = await supabase
            .from('scripts')
            .select('*')
            .eq('id', id)
            .maybeSingle(); // Safer than .single()

        if (error) throw error;
        if (!data) {
            console.warn('❌ [BACKEND] SCRIPT NO ENCONTRADO:', id);
            return NextResponse.json({ error: 'Script not found' }, { status: 404 });
        }

        return NextResponse.json({ ok: true, data });
    } catch (err) {
        console.error('❌ [BACKEND] GET ERROR:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    const { id } = params;
    try {
        const body = await req.json();
        
        console.log('📡 [BACKEND] AUDITORÍA PATCH (v6.2.0)');
        console.log('📍 ID:', id);
        console.log('📦 BODY:', JSON.stringify(body, null, 2));

        // Allowed fields
        const allowedFields = ['title', 'hook', 'content', 'cta', 'notes', 'post_copy', 'structure', 'platform'];
        const updateData = {};
        
        allowedFields.forEach(field => {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        });

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        updateData.updated_at = new Date().toISOString();

        // EXECUTE UPDATE
        const { data, error } = await supabase
            .from('scripts')
            .update(updateData)
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) {
            console.error('❌ [BACKEND] SUPABASE ERROR:', error);
            throw error;
        }

        if (!data) {
            console.error('❌ [BACKEND] UPDATE FAILED: No data returned (RLS or Missing ID)');
            return NextResponse.json({ error: 'Update failed. Check RLS or ID.' }, { status: 403 });
        }

        console.log('✅ [BACKEND] UPDATE EXITOSO');
        return NextResponse.json({ ok: true, data });
    } catch (err) {
        console.error('❌ [BACKEND] PATCH ERROR:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
