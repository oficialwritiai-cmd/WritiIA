import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req) {
    try {
        // Autenticar usuario desde cookies
        const cookieStore = cookies();
        const supabaseSession = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    get(name) { return cookieStore.get(name)?.value; },
                    set() {},
                    remove() {},
                },
            }
        );

        const { data: { user }, error: authErr } = await supabaseSession.auth.getUser();
        if (authErr || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Usar service role para acceder a todos los datos
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Buscar todos los eventos del usuario para junio 2025
        const { data: calendarEvents } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', user.id)
            .gte('event_date', '2025-06-01')
            .lte('event_date', '2025-06-30')
            .order('event_date', { ascending: false });

        // Buscar todos los scripts/guiones del usuario
        const { data: libraryScripts } = await supabase
            .from('library')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', 'script')
            .order('created_at', { ascending: false });

        // Buscar en scripts table también
        const { data: allScripts } = await supabase
            .from('scripts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        return NextResponse.json({
            user: { id: user.id, email: user.email },
            calendarEventsJune: calendarEvents || [],
            libraryScripts: libraryScripts || [],
            allScripts: allScripts || [],
        });
    } catch (err) {
        console.error('Recovery error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
