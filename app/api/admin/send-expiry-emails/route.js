import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession, isAdmin, unauthorized, forbidden } from '@/lib/auth-guard';
import { sendTrialExpiringEmail, sendTrialExpiredEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Envia los emails de aviso/expiracion de trial.
 *
 * Dos formas de llamarlo:
 *  1. Automatica (cron externo, ej. cron-job.org): pasando ?secret=CRON_SECRET
 *     en la URL. No requiere sesion — usa el cliente con service role.
 *  2. Manual (admin logueado): sin secret, requiere is_admin=true.
 *
 * No usa una columna de "ya enviado" en BD (no se asume el esquema);
 * llamarlo mas de una vez el mismo dia puede reenviar el email a los
 * mismos usuarios — improbable si el cron corre 1 vez al dia.
 */
async function runExpiryEmails() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const now = new Date();
    const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const today = startOfDay(now);
    const in1Day = new Date(today); in1Day.setDate(in1Day.getDate() + 1);
    const in3Days = new Date(today); in3Days.setDate(in3Days.getDate() + 3);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

    // ── Grupo 1: termina en ~2 dias ─────────────────────────────────
    const { data: expiringSoon, error: errExpiring } = await supabase
        .from('users_profiles')
        .select('id, email, name, trial_ends_at')
        .eq('plan', 'trial')
        .eq('trial_active', true)
        .gte('trial_ends_at', in1Day.toISOString())
        .lt('trial_ends_at', in3Days.toISOString());

    if (errExpiring) throw errExpiring;

    const expiringResults = [];
    for (const profile of expiringSoon || []) {
        if (!profile.email) continue;
        const { success, reason } = await sendTrialExpiringEmail(profile.email, profile.name, profile.trial_ends_at);
        expiringResults.push({ email: profile.email, success, reason: success ? undefined : reason });
    }

    // ── Grupo 2: expiro hoy o ayer ───────────────────────────────────
    const { data: justExpired, error: errExpired } = await supabase
        .from('users_profiles')
        .select('id, email, name, trial_ends_at')
        .eq('plan', 'trial')
        .gte('trial_ends_at', yesterday.toISOString())
        .lt('trial_ends_at', today.toISOString());

    if (errExpired) throw errExpired;

    const expiredResults = [];
    for (const profile of justExpired || []) {
        if (!profile.email) continue;
        const { success, reason } = await sendTrialExpiredEmail(profile.email, profile.name);
        expiredResults.push({ email: profile.email, success, reason: success ? undefined : reason });
    }

    return {
        ok: true,
        expiringSoon: { count: expiringResults.length, results: expiringResults },
        justExpired: { count: expiredResults.length, results: expiredResults },
    };
}

async function handle(request) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');
        const isCron = !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;

        if (!isCron) {
            const { user, supabase } = await getServerSession(request);
            if (!user) return unauthorized();
            if (!(await isAdmin(supabase, user.id))) return forbidden('Solo administradores.');
        }

        const result = await runExpiryEmails();
        return NextResponse.json(result);
    } catch (err) {
        console.error('[admin/send-expiry-emails] Error:', err);
        return NextResponse.json({ error: err.message || 'Error interno.' }, { status: 500 });
    }
}

export async function GET(request) { return handle(request); }
export async function POST(request) { return handle(request); }
