import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        if (session.metadata && session.metadata.type === 'credits_purchase') {
            const userId = session.metadata.userId;
            const packStr = session.metadata.pack;

            const packAmounts = {
                '100': 100,
                '250': 250,
                '500': 500
            };

            const amount = packAmounts[packStr];

            if (userId && amount) {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
                const supabase = createClient(supabaseUrl, supabaseServiceKey);

                try {
                    const { error } = await supabase.rpc('deposit_credits', {
                        u_id: userId,
                        amount: amount
                    });

                    if (error) {
                        console.error('Error crediting user account via webhook:', error);
                        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
                    }
                    console.log(`Successfully credited ${amount} to user ${userId}`);
                } catch (dbErr) {
                    console.error('Exception crediting user account via webhook:', dbErr);
                    return NextResponse.json({ error: 'Database exception' }, { status: 500 });
                }
            } else {
                console.warn('Webhook received but unable to parse userId or pack amount', session.metadata);
            }
        }
    }

    return NextResponse.json({ received: true });
}
