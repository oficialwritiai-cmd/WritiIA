import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { sendPlanActivationEmail, sendCreditsEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
}

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

    const supabase = getSupabase();

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                await handleCheckoutCompleted(session, supabase);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await handleSubscriptionDeleted(subscription, supabase);
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                await handleSubscriptionUpdated(subscription, supabase);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    } catch (err) {
        console.error(`Error processing webhook event ${event.type}:`, err);
        return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────
// Checkout Session Completed
// ─────────────────────────────────────────────
async function handleCheckoutCompleted(session, supabase) {
    const type = session.metadata?.type;
    const userId = session.metadata?.userId || session.client_reference_id;
    const customerId = session.customer;

    console.log(`[Webhook] checkout.session.completed | type=${type} | userId=${userId} | customer=${customerId}`);

    if (!userId) {
        console.warn('[Webhook] No userId found in session metadata or client_reference_id');
        return;
    }

    // ── PLAN PRO (subscription) ──
    if (type === 'plan_pro' || session.mode === 'subscription') {
        console.log('[Webhook] Processing Plan Pro activation for user:', userId);

        // Update user profile
        const { error } = await supabase
            .from('users_profiles')
            .update({
                plan: 'pro',
                subscription_status: 'active',
                stripe_customer_id: customerId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

        if (error) {
            console.error('[Webhook] Error activating plan:', error);
            throw error;
        }

        console.log(`[Webhook] ✅ Plan Pro activated for user ${userId}`);

        // Send confirmation email
        const { data: profile } = await supabase
            .from('users_profiles')
            .select('email, name')
            .eq('id', userId)
            .single();

        if (profile?.email) {
            await sendPlanActivationEmail(profile.email, profile.name);
        }

        return;
    }

    // ── CREDITS (one-time payment) ──
    if (type === 'credits_purchase' || session.mode === 'payment') {
        const packType = session.metadata?.pack_type || session.metadata?.pack;
        const packAmounts = { '100': 100, '250': 250, '500': 500 };
        const amount = packAmounts[packType];

        console.log('[Webhook] Processing credits purchase:', { userId, packType, amount });

        if (!amount) {
            console.warn('[Webhook] Unknown pack_type:', packType);
            return;
        }

        // Save customer ID if not set
        if (customerId) {
            await supabase
                .from('users_profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', userId);
        }

        // Add credits via RPC
        const { error } = await supabase.rpc('deposit_credits', {
            u_id: userId,
            amount: amount,
        });

        if (error) {
            console.error('[Webhook] Error depositing credits:', error);
            throw error;
        }

        console.log(`[Webhook] ✅ ${amount} credits added to user ${userId}`);

        // Send confirmation email
        const { data: profile } = await supabase
            .from('users_profiles')
            .select('email, name')
            .eq('id', userId)
            .single();

        if (profile?.email) {
            await sendCreditsEmail(profile.email, profile.name, amount);
        }

        return;
    }

    console.log('[Webhook] Unhandled checkout type:', type, 'mode:', session.mode);
}

// ─────────────────────────────────────────────
// Subscription Deleted (Cancelled)
// ─────────────────────────────────────────────
async function handleSubscriptionDeleted(subscription, supabase) {
    const customerId = subscription.customer;

    console.log('[Webhook] Subscription deleted for customer:', customerId);

    const { data: profile, error: findError } = await supabase
        .from('users_profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (findError || !profile) {
        console.error('[Webhook] Could not find user for customer:', customerId);
        return;
    }

    const { error } = await supabase
        .from('users_profiles')
        .update({
            plan: 'Free',
            subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

    if (error) {
        console.error('[Webhook] Error deactivating plan:', error);
        throw error;
    }

    console.log(`[Webhook] ✅ Plan deactivated for user ${profile.id}`);
}

// ─────────────────────────────────────────────
// Subscription Updated (e.g. past_due, paused)
// ─────────────────────────────────────────────
async function handleSubscriptionUpdated(subscription, supabase) {
    const customerId = subscription.customer;
    const status = subscription.status; // active, past_due, canceled, unpaid, etc.

    console.log('[Webhook] Subscription updated:', { customerId, status });

    const { data: profile, error: findError } = await supabase
        .from('users_profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (findError || !profile) {
        console.error('[Webhook] Could not find user for customer:', customerId);
        return;
    }

    const isPro = status === 'active' || status === 'trialing';

    const { error } = await supabase
        .from('users_profiles')
        .update({
            plan: isPro ? 'pro' : 'Free',
            subscription_status: status,
            updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

    if (error) {
        console.error('[Webhook] Error updating subscription status:', error);
        throw error;
    }

    console.log(`[Webhook] ✅ Subscription status updated to '${status}' for user ${profile.id}`);
}
