import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    try {
        const { userId } = await request.json();

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify admin
        const { data: profile } = await supabase.from('users_profiles').select('is_admin').eq('id', userId).single();

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'No tienes permisos para realizar esta accion.' }, { status: 403 });
        }

        const deployHook = process.env.VERCEL_DEPLOY_HOOK;
        if (!deployHook) {
            return NextResponse.json({ error: 'El Deploy Hook de Vercel no esta configurado en las variables de entorno.' }, { status: 500 });
        }

        const res = await fetch(deployHook, { method: 'POST' });

        if (!res.ok) {
            throw new Error('Vercel rechazo la solicitud de despliegue.');
        }

        return NextResponse.json({ success: true, message: 'Despliegue iniciado correctamente en Vercel.' });
    } catch (err) {
        console.error('Error en deploy admin:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
