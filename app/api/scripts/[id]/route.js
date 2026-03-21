import { createSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * API Scripts Handler - v6.1.0 (Grand Simplicity)
 * Handles GET (fetch fresh) and PATCH (partial update) for single scripts.
 */

const supabase = createSupabaseClient();

export async function GET(req, { params }) {
    const { id } = params;
    try {
        const { data, error } = await supabase
            .from('scripts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return NextResponse.json({ error: 'Script not found' }, { status: 404 });

        return NextResponse.json({ ok: true, data });
    } catch (err) {
        console.error('API Scripts GET Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    const { id } = params;
    try {
        const body = await req.json();
        
        // Allowed fields for partial updates
        const allowedFields = ['title', 'hook', 'content', 'cta', 'notes', 'post_copy', 'structure', 'platform', 'updated_at'];
        const updateData = {};
        
        allowedFields.forEach(field => {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        });

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
        }

        // Always update timestamp if not provided
        if (!updateData.updated_at) {
            updateData.updated_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('scripts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, data });
    } catch (err) {
        console.error('API Scripts PATCH Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
