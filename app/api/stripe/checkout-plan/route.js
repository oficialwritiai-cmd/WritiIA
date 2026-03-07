import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Product ID for Writi Plan Pro (monthly subscription)
const PLAN_PRO_PRODUCT_ID = 'prod_U5UwL2r9WiYZXS';

export async function POST(request) {
    try {
        const { userId, email } = await request.json();

        if (!userId || !email) {
            return NextResponse.json({ error: 'userId and email are required' }, { status: 400 });
        }

        // Look up the active price for the Plan Pro product
        const prices = await stripe.prices.list({
            product: PLAN_PRO_PRODUCT_ID,
            active: true,
            limit: 1,
        });

        if (!prices.data.length) {
            console.error('No active price found for product', PLAN_PRO_PRODUCT_ID);
            return NextResponse.json({ error: 'No se encontró el precio del plan' }, { status: 500 });
        }

        const priceId = prices.data[0].id;

        // Check if user already has a stripe_customer_id
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: profile } = await supabase
            .from('users_profiles')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();

        let customerId = profile?.stripe_customer_id;

        // If no customer exists, create one in Stripe
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: email,
                metadata: { userId },
            });
            customerId = customer.id;

            // Save stripe_customer_id to profile
            await supabase
                .from('users_profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', userId);
        }

        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://writi.ai';

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${origin}/dashboard?plan_activated=true`,
            cancel_url: `${origin}/dashboard/settings`,
            client_reference_id: userId,
            metadata: {
                userId: userId,
                type: 'plan_pro',
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Error creating plan checkout session:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
