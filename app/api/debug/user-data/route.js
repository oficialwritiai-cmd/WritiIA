import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
    try {
        const { email } = await req.json();

        // Buscar usuario por email
        const { data: userData, error: userErr } = await supabase
            .from('users_profiles')
            .select('id, email')
            .eq('email', email)
            .single();

        if (userErr || !userData) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const userId = userData.id;

        // Buscar eventos de calendario del 2 de junio 2025
        const { data: events } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', userId)
            .gte('event_date', '2025-06-02')
            .lte('event_date', '2025-06-02');

        // Buscar guiones en library
        const { data: scripts } = await supabase
            .from('library')
            .select('*')
            .eq('user_id', userId)
            .ilike('title', '%Tu mes de contenido%');

        // Buscar guiones en scripts table
        const { data: allScripts } = await supabase
            .from('scripts')
            .select('*')
            .eq('user_id', userId);

        return NextResponse.json({
            user: userData,
            eventsJune2: events || [],
            libraryScripts: scripts || [],
            allScripts: allScripts || [],
        });
    } catch (err) {
        console.error('Debug error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
