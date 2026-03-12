import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const projectId = searchParams.get('projectId');

        if (!userId) return NextResponse.json({ error: 'userId requerido.' }, { status: 400 });

        const supabase = getSupabase();

        let query = supabase
            .from('chat_conversations')
            .select('messages, updated_at')
            .eq('user_id', userId);

        if (projectId && projectId !== 'null') {
            query = query.eq('project_id', projectId);
        } else {
            query = query.is('project_id', null);
        }

        const { data } = await query.single();

        return NextResponse.json({ messages: data?.messages || [] });
    } catch {
        return NextResponse.json({ messages: [] });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { userId, projectId, messages } = body;

        if (!userId || !messages) return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });

        const supabase = getSupabase();

        const record = {
            user_id: userId,
            project_id: projectId || null,
            messages,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('chat_conversations').upsert(record, {
            onConflict: 'user_id,project_id'
        });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[assistant/history] Error:', error);
        return NextResponse.json({ error: 'Error guardando historial.' }, { status: 500 });
    }
}
