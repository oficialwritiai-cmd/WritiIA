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
        const conversationId = searchParams.get('id');

        if (!userId) return NextResponse.json({ error: 'userId requerido.' }, { status: 400 });

        const supabase = getSupabase();

        // Mode A: Get specific conversation messages
        if (conversationId && conversationId !== 'null') {
            const { data, error } = await supabase
                .from('chat_conversations')
                .select('messages, updated_at, title')
                .eq('id', conversationId)
                .single();
            
            if (error) return NextResponse.json({ messages: [], title: 'Nueva conversación' });
            return NextResponse.json({ messages: data?.messages || [], title: data?.title });
        }

        // Mode B: List all conversations for project
        let query = supabase
            .from('chat_conversations')
            .select('id, title, updated_at')
            .eq('user_id', userId)
            .eq('is_archived', false);

        if (projectId && projectId !== 'null') {
            query = query.eq('project_id', projectId);
        } else {
            query = query.is('project_id', null);
        }

        const { data } = await query.order('updated_at', { ascending: false });

        return NextResponse.json({ conversations: data || [] });
    } catch (error) {
        console.error('[assistant/history] GET Error:', error);
        return NextResponse.json({ conversations: [], messages: [] });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { userId, projectId, messages, id, title } = body;

        if (!userId || !messages) return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });

        const supabase = getSupabase();

        // Generate title if not provided and it's a new or first-message conversation
        let conversationTitle = title;
        if (!conversationTitle && messages.length > 0) {
            const firstUserMsg = messages.find(m => m.role === 'user');
            if (firstUserMsg) {
                conversationTitle = firstUserMsg.content.substring(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '');
            }
        }

        // ─── History Trimming (v8.3.0) ───────────────────
        // Prevent DB bloat by keeping only essential context + recent messages
        let processedMessages = messages;
        if (messages.length > 60) {
            const firstPart = messages.slice(0, 5);
            const lastPart = messages.slice(-35);
            processedMessages = [
                ...firstPart,
                { 
                    id: 'trim-' + Date.now(), 
                    role: 'assistant', 
                    content: '[Contexto optimizado: Nico mantiene el foco en tu proyecto y los últimos mensajes para mayor velocidad. ⚡]',
                    timestamp: new Date().toISOString()
                },
                ...lastPart
            ];
        }

        const record = {
            user_id: userId,
            project_id: projectId || null,
            messages: processedMessages,
            title: conversationTitle || 'Conversación sin título',
            updated_at: new Date().toISOString()
        };

        if (id) {
            record.id = id;
        }

        const { data, error } = await supabase
            .from('chat_conversations')
            .upsert(record, { onConflict: 'id' })
            .select('id')
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, id: data?.id });
    } catch (error) {
        console.error('[assistant/history] Error:', error);
        return NextResponse.json({ error: 'Error guardando historial.' }, { status: 500 });
    }
}
