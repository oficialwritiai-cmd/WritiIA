import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { pack, userId, email } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        if (!['100', '250', '500'].includes(String(pack))) {
            return NextResponse.json({ error: 'Pack de créditos inválido' }, { status: 400 });
        }

        let priceId;
        const packStr = String(pack);

        if (packStr === '100') priceId = process.env.STRIPE_PRICE_CREDITS_100;
        else if (packStr === '250') priceId = process.env.STRIPE_PRICE_CREDITS_250;
        else if (packStr === '500') priceId = process.env.STRIPE_PRICE_CREDITS_500;

        if (!priceId) {
            console.error(`Price ID not found for pack ${packStr}. Enviroment variable STRIPE_PRICE_CREDITS_${packStr} is missing.`);
            return NextResponse.json({
                error: `Configuración de precio (STRIPE_PRICE_CREDITS_${packStr}) no encontrada en el servidor.`
            }, { status: 500 });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'payment', // One-time payment for credits
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}&credits_purchased=${pack}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
            customer_email: email,
            client_reference_id: userId,
            metadata: {
                userId: userId,
                pack: pack,
                type: 'credits_purchase'
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Error creating credits checkout session:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
