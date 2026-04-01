import { NextResponse } from 'next/server';
import { getServerSession, unauthorized } from '@/lib/auth-guard';

/**
 * API Scripts Handler - v6.3.0 (Guided Debug)
 * Handles GET (fetch fresh) and PATCH (partial update) for single scripts with mandatory tracing.
 */

export async function GET(req, { params }) {
    const { id } = params;
    
    try {
        const { user, supabase } = await getServerSession(req);
        if (!user) return unauthorized();

        const { data: row, error } = await supabase
            .from('scripts')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .maybeSingle();

        // REQUERIMIENTO v6.3.0: Log de carga
        console.log('GET_SCRIPT', { scriptId: id, userId: user.id, row });

        if (error) throw error;
        if (!row) return NextResponse.json({ error: 'Script not found' }, { status: 404 });

        return NextResponse.json({ ok: true, data: row });
    } catch (err) {
        console.error('❌ [BACKEND] GET_SCRIPT ERROR:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req, { params }) {
    const { id } = params;
    
    try {
        const { user, supabase } = await getServerSession(req);
        if (!user) return unauthorized();

        const body = await req.json();
        
        // REQUERIMIENTO v6.3.0: Log de entrada
        console.log('UPDATE_SCRIPT_REQUEST', {
            scriptId: id,
            userId: user.id,
            body
        });

        // Map allowed fields (simple update as requested)
        const updateData = {
            title: body.title,
            hook: body.hook,
            content: body.content, // mapping user's "body" to "content"
            cta: body.cta,
            post_copy: body.post_copy,
            notes: body.notes,
            structure: body.structure,
            platform: body.platform,
            updated_at: new Date().toISOString()
        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        // First, check if the script exists and belongs to this user
        const { data: existing } = await supabase
            .from('scripts')
            .select('id, user_id')
            .eq('id', id)
            .maybeSingle();

        let upErr;
        if (existing) {
            // Script exists — only update if it belongs to this user
            if (existing.user_id !== user.id) {
                return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
            }
            const { error } = await supabase
                .from('scripts')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', user.id);
            upErr = error;
        } else {
            // New script from library — insert with explicit ownership
            const { error } = await supabase
                .from('scripts')
                .insert({ id, user_id: user.id, ...updateData });
            upErr = error;
        }

        if (upErr) {
            console.error('❌ [BACKEND] UPDATE_ERROR:', upErr);
            throw upErr;
        }

        // REQUERIMIENTO v6.3.0: Verificación inmediata
        const { data: resultRow, error: selErr } = await supabase
            .from('scripts')
            .select('title, hook, content, cta, post_copy, notes')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (selErr) console.warn('⚠️ [BACKEND] COULD NOT VERIFY UPDATE:', selErr);
        
        console.log('UPDATE_SCRIPT_RESULT', resultRow);

        return NextResponse.json({ ok: true, data: resultRow });
    } catch (err) {
        console.error('❌ [BACKEND] PATCH_SCRIPT_ERROR:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
