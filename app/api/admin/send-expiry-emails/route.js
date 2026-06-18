import { NextResponse } from 'next/server';
import { getServerSession, isAdmin, unauthorized, forbidden } from '@/lib/auth-guard';
import { sendTrialExpiringEmail, sendTrialExpiredEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Endpoint manual de administración — sin cron automático (depende del
 * plan de Vercel). Llamar manualmente (ej. una vez al día) para enviar:
 *  - Email "termina en 2 días" a usuarios en trial cuyo trial_ends_at
 *    cae exactamente dentro de 1-2 días.
 *  - Email "ha finalizado" a usuarios en trial cuyo trial_ends_at fue hoy.
 *
 * No usa una columna de "ya enviado" en BD (no se asume el esquema);
 * llamarlo más de una vez el mismo día puede reenviar el email a los
 * mismos usuarios — aceptable porque es un disparo manual controlado
 * por un admin, no automático.
 */
export async function POST(request) {
    try {
        const { user, supabase } = await getServerSession(request);
        if (!user) return unauthorized();
        if (!(await isAdmin(supabase, user.id))) return forbidden('Solo administradores.');

        const now = new Date();
        const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
        const today = startOfDay(now);
        const in1Day = new Date(today); in1Day.setDate(in1Day.getDate() + 1);
        const in2Days = new Date(today); in2Days.setDate(in2Days.getDate() + 2);
        const in3Days = new Date(today); in3Days.setDate(in3Days.getDate() + 3);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

        // ── Grupo 1: termina en ~2 días ─────────────────────────────────
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

        // ── Grupo 2: expiró hoy o ayer ───────────────────────────────────
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

        return NextResponse.json({
            ok: true,
            expiringSoon: { count: expiringResults.length, results: expiringResults },
            justExpired: { count: expiredResults.length, results: expiredResults },
        });
    } catch (err) {
        console.error('[admin/send-expiry-emails] Error:', err);
        return NextResponse.json({ error: err.message || 'Error interno.' }, { status: 500 });
    }
}
