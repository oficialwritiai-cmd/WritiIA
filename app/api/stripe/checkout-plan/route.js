import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const PLAN_PRO_PRODUCT_ID = 'prod_UCYvpgtHDqmkqX';

export async function POST(request) {
    try {
        // Autenticar desde cookies de sesión (no depende del cliente)
        const cookieStore = cookies();
        const supabaseSession = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    get(name) { return cookieStore.get(name)?.value; },
                    set() {},
                    remove() {},
                },
            }
        );
        const { data: { user: sessionUser } } = await supabaseSession.auth.getUser();

        // Aceptar userId/email del body como fallback (para compatibilidad)
        let body = {};
        try { body = await request.json(); } catch {}

        const userId = sessionUser?.id || body.userId;
        const email  = sessionUser?.email || body.email;

        if (!userId || !email) {
            return NextResponse.json({ error: 'No autenticado. Inicia sesión de nuevo.' }, { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const prices = await stripe.prices.list({
            product: PLAN_PRO_PRODUCT_ID,
            active: true,
            limit: 1,
        });

        if (!prices.data.length) {
            return NextResponse.json({ error: 'No se encontró el precio del plan' }, { status: 500 });
        }
        const priceId = prices.data[0].id;

        const { data: profile } = await supabase
            .from('users_profiles')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();

        let customerId = profile?.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({ email, metadata: { userId } });
            customerId = customer.id;
            await supabase
                .from('users_profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', userId);
        }

        let origin = request.headers.get('origin');
        if (!origin || origin === 'null') {
            const host = request.headers.get('host');
            const protocol = host?.includes('localhost') ? 'http' : 'https';
            origin = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'https://writi.ai');
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${origin}/dashboard?plan_activated=true`,
            cancel_url: `${origin}/dashboard/expired`,
            client_reference_id: userId,
            metadata: { userId, type: 'plan_pro' },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Error creating plan checkout session:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
