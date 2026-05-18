import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

function parseDate(val) {
    if (!val) return null;
    // Normalize Supabase timestamp: '2026-05-25 13:44:27.150255+00' → valid ISO
    const s = String(val)
        .replace(' ', 'T')
        .replace(/\.\d+/, '')     // remove microseconds
        .replace(/\+00$/, 'Z')   // +00 → Z
        .replace(/\+00:00$/, 'Z');
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

export async function GET() {
    try {
        const cookieStore = cookies();
        // Use session-aware client only — no SERVICE_ROLE needed
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { cookies: { get: (n) => cookieStore.get(n)?.value } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ allowed: false, reason: 'unauthenticated' }, { status: 401 });

        const { data: profile, error } = await supabase
            .from('users_profiles')
            .select('plan, trial_active, trial_ends_at, subscription_status, credits_balance')
            .eq('id', user.id)
            .single();

        // DB error → allow through (don't punish user for server issues)
        if (error || !profile) {
            return NextResponse.json({ allowed: true, reason: 'db_error_passthrough' });
        }

        const hasActivePlan =
            profile.plan === 'pro' ||
            profile.subscription_status === 'active' ||
            profile.subscription_status === 'trialing';

        const trialEnd = parseDate(profile.trial_ends_at);
        const trialActive =
            profile.trial_active === true &&
            trialEnd !== null &&
            trialEnd > new Date();

        if (hasActivePlan || trialActive) {
            return NextResponse.json({ allowed: true, plan: profile.plan });
        }

        return NextResponse.json({ allowed: false, reason: 'no_plan', plan: profile.plan }, { status: 403 });

    } catch (e) {
        // Any error → allow through, don't block paying users
        return NextResponse.json({ allowed: true, reason: 'error_passthrough' });
    }
}
