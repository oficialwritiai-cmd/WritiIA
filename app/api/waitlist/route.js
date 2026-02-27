import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json(
                { error: 'Email inválido.' },
                { status: 400 }
            );
        }

        // Si Supabase está configurado, guardar en la tabla waitlist
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(supabaseUrl, supabaseKey);

            await supabase.from('waitlist').insert({
                email: email.trim().toLowerCase(),
                source: 'landing_page',
            });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error en waitlist:', err);
        return NextResponse.json({ success: true }); // No revelar errores internos
    }
}
