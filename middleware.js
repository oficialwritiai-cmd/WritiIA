import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function middleware(req) {
    let res = NextResponse.next({
        request: {
            headers: req.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) {
                    return req.cookies.get(name)?.value;
                },
                set(name, value, options) {
                    req.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    res = NextResponse.next({
                        request: {
                            headers: req.headers,
                        },
                    });
                    res.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name, options) {
                    req.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    res = NextResponse.next({
                        request: {
                            headers: req.headers,
                        },
                    });
                    res.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    // PKCE Interceptor: Si viene un código de Supabase (ej. confirmación de email) hacia una ruta protegida
    // Redirigir al manejador de Auth Callback para intercambiarlo por sesión antes de validarlo.
    if (req.nextUrl.searchParams.has('code') && req.nextUrl.pathname.startsWith('/dashboard')) {
        const callbackUrl = req.nextUrl.clone();
        callbackUrl.pathname = '/auth/callback';
        callbackUrl.searchParams.set('next', req.nextUrl.pathname);
        return NextResponse.redirect(callbackUrl);
    }

    // Optimized: Use getUser() for security, as it verifies the token on every request
    const { data: { user } } = await supabase.auth.getUser();

    // Check 1: Email must be confirmed
    if (user && !user.email_confirmed_at && req.nextUrl.pathname.startsWith('/dashboard')) {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.searchParams.set('error', 'Por favor confirma tu email antes de continuar');
        return NextResponse.redirect(redirectUrl);
    }

    // Check 2: SECURITY — Block ALL dashboard pages without active plan
    const protectedPath = user &&
        req.nextUrl.pathname.startsWith('/dashboard') &&
        req.nextUrl.pathname !== '/dashboard/expired' &&
        req.nextUrl.pathname !== '/dashboard/settings';

    if (protectedPath) {
        const toExpired = () => {
            const r = req.nextUrl.clone();
            r.pathname = '/dashboard/expired';
            return NextResponse.redirect(r);
        };

        // Use session-aware client — user can always read their own profile
        let profile = null;
        try {
            const { data } = await supabase
                .from('users_profiles')
                .select('plan, trial_active, trial_ends_at, subscription_status')
                .eq('id', user.id)
                .single();
            profile = data;
        } catch (_) {
            return res; // DB error → let through
        }

        // No profile = not a paying user
        if (!profile) return toExpired();

        const hasActivePlan =
            profile.plan === 'pro' ||
            profile.subscription_status === 'active' ||
            profile.subscription_status === 'trialing';

        // Robust date parse: handles microseconds and +00 without colon
        const trialEndRaw = profile.trial_ends_at;
        let trialEndDate = null;
        if (trialEndRaw) {
            const s = String(trialEndRaw).replace(' ', 'T').replace(/\.\d+/, '').replace(/\+00$/, 'Z').replace(/\+00:00$/, 'Z');
            const d = new Date(s);
            trialEndDate = isNaN(d.getTime()) ? null : d;
        }
        const trialActive =
            profile.trial_active === true &&
            trialEndDate !== null &&
            trialEndDate > new Date();

        // pending = payment in progress, not confirmed yet
        const isPending = profile.plan === 'pending';

        if (!hasActivePlan && !trialActive) return toExpired();
        if (isPending) return toExpired();
    }

    // If there is no user and they're trying to access a protected route
    if (!user && req.nextUrl.pathname.startsWith('/dashboard')) {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // Anti-loop for authenticated users trying to go to login
    // PERO: Si el email NO está confirmado, permitir que vuelvan a /login
    if (user && !user.email_confirmed_at) {
        // Permitir acceso a /login y /auth si email no está confirmado
        // Para que puedan ver el error y confirmar
        if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname.startsWith('/auth')) {
            return res;
        }
    }

    // Anti-loop para usuarios con email confirmado
    if (user && user.email_confirmed_at && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/auth')) {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/dashboard/home';
        return NextResponse.redirect(redirectUrl);
    }

    return res;
}

export const config = {
    matcher: ['/dashboard/:path*', '/login', '/auth'],
};
