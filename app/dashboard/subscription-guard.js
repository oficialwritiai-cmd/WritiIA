import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';

/**
 * Server-side subscription guard.
 * Call at the top of every protected Server Component.
 * Uses SERVICE_ROLE_KEY — bypasses RLS, always gets the real profile.
 */
export async function requireSubscription(pathname = '') {
    // Skip check on these pages
    if (pathname === '/dashboard/expired' || pathname === '/dashboard/settings') return null;

    const cookieStore = cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    // 1. Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 2. Get profile — no RLS, guaranteed result
    const { data: profile } = await supabase
        .from('users_profiles')
        .select('plan, trial_active, trial_ends_at, subscription_status')
        .eq('id', user.id)
        .single();

    // 3. No profile = no access
    if (!profile) redirect('/dashboard/expired');

    // 4. Check plan
    const hasActivePlan =
        profile.plan === 'pro' ||
        profile.subscription_status === 'active' ||
        profile.subscription_status === 'trialing';

    const trialActive =
        profile.trial_active === true &&
        profile.trial_ends_at &&
        new Date(profile.trial_ends_at) > new Date();

    if (!hasActivePlan && !trialActive) redirect('/dashboard/expired');

    return { user, profile };
}
