import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard/home';

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=auth-verificacion`);
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) { return cookieStore.get(name)?.value; },
                set(name, value, options) { cookieStore.set({ name, value, ...options }); },
                remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
            },
        }
    );

    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !session?.user) {
        console.error('[Auth Callback] exchangeCodeForSession failed:', error?.message);
        return NextResponse.redirect(`${origin}/login?error=auth-verificacion`);
    }

    // Use service role to bypass RLS — guaranteed read
    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch profile (may have been created by a DB trigger)
    let { data: profile } = await adminClient
        .from('users_profiles')
        .select('plan, trial_active, trial_ends_at, subscription_status')
        .eq('id', session.user.id)
        .single();

    // No profile at all — create one as pending
    if (!profile) {
        await adminClient.from('users_profiles').insert({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            plan: 'pending',
            subscription_status: 'pending',
            trial_active: false,
            credits_balance: 0,
            created_at: new Date().toISOString(),
        });
        // Send new user directly to expired — never to dashboard
        return NextResponse.redirect(`${origin}/dashboard/expired`);
    }

    // Profile exists — check access with strict rules:
    // Trial only counts if the user actually used an access key (not created by a DB trigger)
    const trialStillValid =
        profile.trial_active === true &&
        profile.access_key_used &&        // must have a real access key
        profile.trial_ends_at &&
        new Date(profile.trial_ends_at) > new Date();

    // Stripe subscription is the only other valid path
    const hasStripeSubscription =
        (profile.subscription_status === 'active' || profile.subscription_status === 'trialing') &&
        profile.stripe_customer_id;       // must have a real Stripe customer

    const hasActivePlan =
        profile.plan === 'pro' && profile.stripe_customer_id  // pro requires Stripe
        || hasStripeSubscription
        || trialStillValid;

    if (!hasActivePlan) {
        return NextResponse.redirect(`${origin}/dashboard/expired`);
    }

    // Active plan — allow through to intended destination
    return NextResponse.redirect(`${origin}${next}`);
}
