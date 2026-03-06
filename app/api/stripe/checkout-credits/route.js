import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Product IDs for credit packs
const CREDIT_PRODUCTS = {
    '100': 'prod_U5X3aTmOroVFwW',
    '250': 'prod_U5X4JuborfAJNW',
    '500': 'prod_U5X53LOdSC6k9B',
};

export async function POST(request) {
    try {
        const { pack_type, userId, email } = await request.json();

        if (!userId || !email) {
            return NextResponse.json({ error: 'userId and email are required' }, { status: 400 });
        }

        const packStr = String(pack_type);
        if (!['100', '250', '500'].includes(packStr)) {
            return NextResponse.json({ error: 'Pack de créditos inválido. Usa: 100, 250 o 500' }, { status: 400 });
        }

        const productId = CREDIT_PRODUCTS[packStr];

        // Look up the active price for this product
        const prices = await stripe.prices.list({
            product: productId,
            active: true,
            limit: 1,
        });

        if (!prices.data.length) {
            console.error(`No active price found for product ${productId} (pack ${packStr})`);
            return NextResponse.json({ error: `No se encontró el precio para el pack de ${packStr} créditos` }, { status: 500 });
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

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: email,
                metadata: { userId },
            });
            customerId = customer.id;

            await supabase
                .from('users_profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', userId);
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?credits_purchased=${packStr}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
            client_reference_id: userId,
            metadata: {
                userId: userId,
                pack_type: packStr,
                type: 'credits_purchase',
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Error creating credits checkout session:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
