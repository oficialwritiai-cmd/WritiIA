import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTrialWelcomeEmail } from '@/lib/email';

/**
 * Crea el perfil (users_profiles) y activa el trial/llave justo despues
 * del registro — sin depender de si el usuario ya confirmo su email.
 *
 * Usa el service role para no chocar con RLS: justo despues de signUp,
 * si Supabase exige confirmar email, el cliente del navegador todavia
 * no tiene sesion/JWT valido, asi que cualquier insert/update protegido
 * por RLS desde el navegador fallaria silenciosamente (este era el bug
 * raiz: el codigo viejo intentaba hacerlo desde el navegador DESPUES de
 * comprobar la confirmacion, y nunca llegaba a ejecutarse).
 */
export async function POST(req) {
    try {
        const { userId, email, name, hasAccessKey, isMasterKey, accessKeyCode } = await req.json();
        if (!userId || !email) {
            return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        let keyData = null;
        if (hasAccessKey && !isMasterKey && accessKeyCode) {
            const { data } = await supabase
                .from('access_keys').select('*').eq('key_code', accessKeyCode).single();
            if (data && !data.is_used) keyData = data;
        }

        const now = new Date();
        const trialEnds = new Date(); trialEnds.setDate(now.getDate() + 14);
        const isTrialActive = hasAccessKey;
        const plan = isMasterKey ? 'pro' : (hasAccessKey ? 'trial' : 'pending');

        const { error: profileErr } = await supabase.from('users_profiles').upsert({
            id: userId, email, name: name || email.split('@')[0],
            plan, is_admin: isMasterKey,
            trial_started_at: isTrialActive ? now.toISOString() : null,
            trial_ends_at: isTrialActive ? trialEnds.toISOString() : null,
            trial_active: isTrialActive, credits_balance: 250,
            subscription_status: isTrialActive ? 'trial' : 'pending',
            // dashboard/layout.js tiene su propio "SECURITY WALL" que exige este
            // campo ademas de trial_active/trial_ends_at — sin esto, el trial
            // queda bloqueado aunque el resto del perfil este correcto.
            access_key_used: (!isMasterKey && keyData) ? accessKeyCode : null,
            created_at: now.toISOString(),
        });
        if (profileErr) throw profileErr;

        if (!isMasterKey && keyData) {
            await supabase.from('access_keys').update({
                is_used: true, used_by_user_id: userId, used_at: now.toISOString(),
            }).eq('id', keyData.id);

            sendTrialWelcomeEmail(email, name || email.split('@')[0]).catch(err =>
                console.error('[complete-registration] welcome email error:', err)
            );
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[complete-registration] Error:', err);
        return NextResponse.json({ error: err.message || 'Error interno.' }, { status: 500 });
    }
}
