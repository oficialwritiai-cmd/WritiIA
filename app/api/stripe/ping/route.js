import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET() {
    try {
        // Attempt to list prices to verify connection and see active products
        const prices = await stripe.prices.list({
            active: true,
            expand: ['data.product'],
        });

        return NextResponse.json({
            ok: true,
            message: "Stripe connection verified",
            prices: prices.data.map(p => ({
                id: p.id,
                product: p.product.name,
                amount: p.unit_amount / 100,
                currency: p.currency
            }))
        });
    } catch (error) {
        console.error("Stripe verification failed:", error);

        return NextResponse.json({
            ok: false,
            error: error.message,
            type: error.type
        }, { status: 500 });
    }
}
