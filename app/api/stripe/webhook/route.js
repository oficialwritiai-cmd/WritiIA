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
    let userId = session.metadata?.userId || session.client_reference_id;
    const customerId = session.customer;
    const userEmail = session.customer_email || session.metadata?.email;

    console.log(`[Webhook] checkout.session.completed | type=${type} | userId=${userId} | customer=${customerId}`);

    // LOGIC: Check if this is a pending registration
    if (userId) {
        const { data: pending, error: pendingFetchError } = await supabase
            .from('pending_registrations')
            .select('*')
            .eq('id', userId)
            .single();

        if (pending && !pendingFetchError) {
            console.log('[Webhook] Found pending registration for:', pending.email);

            // Create the user via admin auth
            const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                email: pending.email,
                password: pending.password_plan,
                email_confirm: false // Forces them to confirm via email AFTER paying
            });

            if (authError) {
                console.error('[Webhook] Error creating user from pending:', authError);
                // If user already exists (maybe they registered while pago was pending), don't fail everything
                if (!authError.message.includes('already registered')) throw authError;
            } else {
                console.log('[Webhook] Successfully created user:', authUser.user.id);
                // Switch userId to the REAL one
                userId = authUser.user.id;

                // Cleanup pending table
                await supabase.from('pending_registrations').delete().eq('id', pending.id);
            }
        }
    }

    if (!userId && userEmail) {
        console.log('[Webhook] No userId found, attempting lookup by email:', userEmail);
        const { data: profileByEmail } = await supabase
            .from('users_profiles')
            .select('id')
            .eq('email', userEmail)
            .single();
        
        if (profileByEmail) {
            userId = profileByEmail.id;
            console.log('[Webhook] Found userId via email lookup:', userId);
        }
    }

    if (!userId) {
        console.warn('[Webhook] CRITICAL: No userId found in session metadata, client_reference_id, or via email lookup. Email was:', userEmail);
        return;
    }

    // ── PLAN PRO (subscription) ──
    if (type === 'plan_pro' || session.mode === 'subscription') {
        console.log('[Webhook] Processing Plan Pro activation for user:', userId);

        // Update user profile
        let periodEnd = null;
        if (session.subscription) {
            const sub = await stripe.subscriptions.retrieve(session.subscription);
            periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        }

        const { error } = await supabase
            .from('users_profiles')
            .upsert({
                id: userId,
                email: userEmail,
                name: userEmail?.split('@')[0] || 'User',
                plan: 'pro',
                subscription_status: 'active',
                stripe_customer_id: customerId,
                subscription_period_end: periodEnd,
                updated_at: new Date().toISOString(),
            });

        if (error) {
            console.error('[Webhook] Error activating plan:', error);
            throw error;
        }

        console.log(`[Webhook] ✅ Plan Pro activated for user ${userId} until ${periodEnd}`);

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
    if (type === 'credits_purchase' || session.mode === 'payment' || (session.submit_type === 'pay' && !session.subscription)) {
        let packType = session.metadata?.pack_type || session.metadata?.pack;
        const packAmounts = { '100': 100, '250': 250, '500': 500 };
        
        // Logical fallback: if no packType in metadata, but it's a successful payment, 
        // we might check the amount_total, but for now we default to at least 100 if we suspect it's a credit purchase
        let amount = packAmounts[packType];

        if (!amount && session.amount_total) {
            // Stripe amount_total is in cents
            const total = session.amount_total / 100;
            if (total >= 60) amount = 500;
            else if (total >= 30) amount = 250;
            else if (total >= 15) amount = 100;
        }

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

        // Add credits via RPC (updates users_profiles.credits_balance)
        const { error } = await supabase.rpc('deposit_credits', {
            u_id: userId,
            amount: amount,
        });

        // FALLBACK: Also update ai_credits table if it exists to keep everything in sync
        try {
            const { data: currentCredits } = await supabase.from('ai_credits').select('total_credits').eq('user_id', userId).single();
            if (currentCredits) {
                await supabase.from('ai_credits').update({
                    total_credits: (currentCredits.total_credits || 0) + amount,
                    updated_at: new Date().toISOString()
                }).eq('user_id', userId);
            } else {
                // If row doesn't exist, create it
                await supabase.from('ai_credits').insert({
                    user_id: userId,
                    total_credits: amount,
                    used_credits: 0
                });
            }
        } catch (syncErr) {
            console.warn('[Webhook] Non-critical error syncing ai_credits table:', syncErr.message);
        }

        if (error) {
            console.error('[Webhook] Error depositing credits:', error);
            throw error;
        }

        console.log(`[Webhook] ✅ ${amount} credits added to user ${userId} (Synced in both systems)`);

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
    const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;

    const { error } = await supabase
        .from('users_profiles')
        .update({
            plan: isPro ? 'pro' : 'Free',
            subscription_status: status,
            subscription_period_end: periodEnd,
            updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

    if (error) {
        console.error('[Webhook] Error updating subscription status:', error);
        throw error;
    }

    console.log(`[Webhook] ✅ Subscription status updated to '${status}' for user ${profile.id}`);
}
