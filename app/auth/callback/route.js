import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';

    if (code) {
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

        if (!error && session?.user) {
            // For OAuth users (Google, etc.) — create a pending profile if none exists
            // so the middleware can gate them to /dashboard/expired properly
            const adminClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );
            const { data: profile } = await adminClient
                .from('users_profiles')
                .select('id')
                .eq('id', session.user.id)
                .single();

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
            }

            return NextResponse.redirect(`${origin}${next}`);
        } else {
            console.error('[Auth Callback] Error exchanging code for session:', error);
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth-verificacion`);
}
