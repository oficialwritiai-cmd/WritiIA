import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email es obligatorio' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Validar que el usuario existe
        const { data: profile } = await supabase
            .from('users_profiles')
            .select('id, email')
            .eq('email', email)
            .single();

        if (!profile) {
            return NextResponse.json({
                error: 'Si existe una cuenta con este email, recibirás un enlace para restablecer contraseña.'
            }, { status: 404 });
        }

        // Enviar enlace de reset via Supabase Auth
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            email,
            {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`
            }
        );

        if (resetError) {
            console.error('[forgot-password] Error:', resetError);
            return NextResponse.json({
                error: 'Error al enviar correo de recuperación. Intenta de nuevo más tarde.'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Se ha enviado un enlace de recuperación a tu email.'
        });

    } catch (error) {
        console.error('[forgot-password] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
