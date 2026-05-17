import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(req) {
    try {
        const { libraryId } = await req.json();
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { cookies: { get: (n) => cookieStore.get(n)?.value } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { data: item } = await supabase.from('library').select('*').eq('id', libraryId).eq('user_id', user.id).single();
        if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

        // Create share token — use library id as simple token (no sensitive data)
        const token = Buffer.from(libraryId).toString('base64url');
        return NextResponse.json({ token, url: `/share/${token}` });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
