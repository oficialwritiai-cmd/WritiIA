import { NextResponse } from 'next/server';
import { getServerSession, unauthorized } from '@/lib/auth-guard';

export async function GET(req) {
    try {
        // SECURITY: verify JWT — never trust userId from the query string
        const { user, supabase } = await getServerSession(req);
        if (!user) return unauthorized();

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');
        const conversationId = searchParams.get('id');

        // Mode A: Get specific conversation messages (scoped to the owner)
        if (conversationId && conversationId !== 'null') {
            const { data, error } = await supabase
                .from('chat_conversations')
                .select('messages, updated_at, title')
                .eq('id', conversationId)
                .eq('user_id', user.id)
                .single();

            if (error) return NextResponse.json({ messages: [], title: 'Nueva conversación' });
            return NextResponse.json({ messages: data?.messages || [], title: data?.title });
        }

        // Mode B: List all conversations for project
        let query = supabase
            .from('chat_conversations')
            .select('id, title, updated_at')
            .eq('user_id', user.id)
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
        const { user, supabase } = await getServerSession(req);
        if (!user) return unauthorized();

        const body = await req.json();
        const { projectId, messages, id, title } = body;

        if (!messages) return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });

        // If updating an existing conversation, verify it belongs to the user
        if (id) {
            const { data: existing } = await supabase
                .from('chat_conversations')
                .select('user_id')
                .eq('id', id)
                .single();
            if (existing && existing.user_id !== user.id) {
                return NextResponse.json({ error: 'Sin permisos.' }, { status: 403 });
            }
        }

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
            user_id: user.id,
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

export async function DELETE(req) {
    try {
        const { user, supabase } = await getServerSession(req);
        if (!user) return unauthorized();

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

        // Scope the archive to the owner so a user can't delete another's conversation
        await supabase
            .from('chat_conversations')
            .update({ is_archived: true })
            .eq('id', id)
            .eq('user_id', user.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[assistant/history] DELETE Error:', error);
        return NextResponse.json({ error: 'Error eliminando.' }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const { user, supabase } = await getServerSession(req);
        if (!user) return unauthorized();

        const body = await req.json();
        const { id, title } = body;
        if (!id || !title) return NextResponse.json({ error: 'Faltan datos.' }, { status: 400 });

        const { error } = await supabase
            .from('chat_conversations')
            .update({ title, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', user.id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[assistant/history] PATCH Error:', error);
        return NextResponse.json({ error: 'Error al renombrar.' }, { status: 500 });
    }
}
