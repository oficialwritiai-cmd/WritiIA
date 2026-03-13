import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const PLAN_PRO_PRODUCT_ID = 'prod_U8rFSO02urRwcv';

export async function POST(req) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email y contraseña son obligatorios' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users_profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return NextResponse.json({ error: 'Este email ya está registrado. Por favor inicia sesión.' }, { status: 400 });
        }

        // 1. Create pending registration
        const { data: pending, error: pendingError } = await supabase
            .from('pending_registrations')
            .insert({
                email,
                password_plan: password
            })
            .select()
            .single();

        if (pendingError) throw pendingError;

        // 2. Prepare Stripe session
        const prices = await stripe.prices.list({
            product: PLAN_PRO_PRODUCT_ID,
            active: true,
            limit: 1,
        });

        if (!prices.data.length) throw new Error('No active price found');
        const priceId = prices.data[0].id;

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL;

        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${origin}/dashboard?plan_activated=true`,
            cancel_url: `${origin}/login`,
            client_reference_id: pending.id, // Linking to our pending table
            metadata: {
                type: 'plan_pro',
                registration_id: pending.id
            },
        });

        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error('[Register Pending] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
