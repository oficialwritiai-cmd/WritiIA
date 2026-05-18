import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Get the authenticated user via cookies
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { cookies: { get: (n) => cookieStore.get(n)?.value } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ allowed: false, reason: 'unauthenticated' }, { status: 401 });

        // 2. Use SERVICE_ROLE to bypass RLS — always gets real profile
        const admin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: profile } = await admin
            .from('users_profiles')
            .select('plan, trial_active, trial_ends_at, subscription_status')
            .eq('id', user.id)
            .single();

        // 3. No profile = no access
        if (!profile) {
            return NextResponse.json({ allowed: false, reason: 'no_profile' }, { status: 403 });
        }

        // 4. Check active plan
        const hasActivePlan =
            profile.plan === 'pro' ||
            profile.subscription_status === 'active' ||
            profile.subscription_status === 'trialing';

        const trialActive =
            profile.trial_active === true &&
            profile.trial_ends_at &&
            new Date(profile.trial_ends_at) > new Date();

        if (!hasActivePlan && !trialActive) {
            return NextResponse.json({ allowed: false, reason: 'no_plan', plan: profile.plan }, { status: 403 });
        }

        return NextResponse.json({ allowed: true, plan: profile.plan });

    } catch (e) {
        // On any error, deny access to be safe
        return NextResponse.json({ allowed: false, reason: 'error' }, { status: 403 });
    }
}
