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

// Adding GET for easy testing/confirmation that route is live
export async function GET(req) {
    const supabase = getSupabase();
    const url = req.url;
    const userAgent = req.headers.get('user-agent');
    
    let logResult = 'NOT_ATTEMPTED';
    let logError = null;

    try {
        const { error } = await supabase.from('webhook_logs').insert({
            event_type: 'GET_DIAGNOSTIC',
            payload: { url, userAgent, note: 'Testing DB connectivity from Vercel' }
        });
        if (error) {
            logResult = 'ERROR';
            logError = error.message;
        } else {
            logResult = 'SUCCESS';
        }
    } catch (e) {
        logResult = 'EXCEPTION';
        logError = e.message;
    }

    return NextResponse.json({ 
        status: 'Online', 
        service: 'Stripe Webhook',
        db_log: logResult,
        db_error: logError,
        env_check: {
            url_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            key_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            webhook_secret_present: !!process.env.STRIPE_WEBHOOK_SECRET,
        }
    });
}

export async function POST(req) {
    const payload = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;
    const supabase = getSupabase();

    try {
        event = stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        // Log basic info even if signature fails (to check if we are receiving data)
        await supabase.from('webhook_logs').insert({
            event_type: 'SIGNATURE_FAILURE',
            payload: { message: err.message, hasSignature: !!signature },
            error: err.message
        });
        return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
    }

    // Log start of processing
    const { data: logEntry, error: logErr } = await supabase.from('webhook_logs').insert({
        event_type: event.type,
        payload: event.data.object
    }).select().single();

    // Check if event was already processed to ensure idempotency
    const { data: alreadyProcessed } = await supabase
        .from('processed_stripe_events')
        .select('event_id')
        .eq('event_id', event.id)
        .single();

    if (alreadyProcessed) {
        console.log(`[Webhook] Event ${event.id} already processed. Skipping.`);
        return NextResponse.json({ received: true, already_processed: true });
    }

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
        
        // Mark event as processed
        await supabase.from('processed_stripe_events').insert({ event_id: event.id });

        // Mark log as success
        if (logEntry) {
            await supabase.from('webhook_logs').update({ error: 'SUCCESS' }).eq('id', logEntry.id);
        }
    } catch (err) {
        console.error(`Error processing webhook event ${event.type}:`, err);
        if (logEntry) {
            await supabase.from('webhook_logs').update({ error: err.message }).eq('id', logEntry.id);
        }
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
                email_confirm: false // Requerimos que el usuario confirme su email obligatoriamente
            });

            if (authError) {
                console.error('[Webhook] Error creating user from pending:', authError);
                // If user already exists, it will be handled
                if (!authError.message.includes('already registered')) throw authError;
            } else {
                console.log('[Webhook] Successfully created user:', authUser.user.id);
                // Envía el correo de confirmación obligatoriamente
                const rawUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://oficialwritiai.vercel.app';
                const anonClient = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
                );
                
                // Forzar el envío del correo de verificación llamando a resend
                await anonClient.auth.resend({
                    type: 'signup',
                    email: pending.email,
                    options: {
                        emailRedirectTo: `${rawUrl}/auth/callback?next=/dashboard`
                    }
                }).catch(err => console.error('[Webhook] Failed to resend signup email:', err));

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
        console.warn('[Webhook] CRITICAL: No userId found. Logging to DB and exiting.');
        if (logEntry) {
            await supabase.from('webhook_logs').update({ 
                error: 'MISSING_USER_ID',
                payload: { ...session, WARNING: 'No userId found in metadata or email lookup' }
            }).eq('id', logEntry.id);
        }
        return;
    }

    // ENSURE the profile has the stripe_customer_id saved
    if (customerId) {
        await supabase
            .from('users_profiles')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId);
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
            .update({
                plan: 'pro',
                subscription_status: 'active',
                stripe_customer_id: customerId,
                subscription_period_end: periodEnd,
                trial_active: false,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

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

        const emailToSendTo = profile?.email || userEmail || session.customer_details?.email;
        if (emailToSendTo) {
            console.log('[Webhook] Sending activation email to:', emailToSendTo);
            await sendPlanActivationEmail(emailToSendTo, profile?.name || 'Usuario');
        } else {
            console.warn('[Webhook] No email found to send activation email');
        }

        return;
    }

    // ── CREDITS (one-time payment) ──
    if (type === 'credits_purchase' || session.mode === 'payment' || (session.submit_type === 'pay' && !session.subscription)) {
        let packType = session.metadata?.pack_type || session.metadata?.pack;
        const packAmounts = { '100': 100, '250': 250, '500': 500 };
        
        let amount = packAmounts[packType];

        if (!amount && session.amount_total) {
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

        // Add credits via single source of truth: users_profiles.credits_balance
        // We use a transaction-like approach or atomic update to prevent double additions
        // We also check if this specific session was already handled for credits specifically
        
        const { data: currentProfile, error: fetchErr } = await supabase
            .from('users_profiles')
            .select('credits_balance')
            .eq('id', userId)
            .single();

        if (fetchErr) throw new Error(`Could not fetch profile for credit deposit: ${fetchErr.message}`);

        const newBalance = (currentProfile.credits_balance || 0) + amount;

        // Atomic update with idempotency check on credits_usage log
        // If the insert into credits_usage fails due to idempotency_key (unique), the whole thing should fail or skip
        const { error: logErr } = await supabase.from('credits_usage').insert({
            user_id: userId,
            action_type: 'purchase_credits',
            amount: amount,
            idempotency_key: `stripe_session_${session.id}` // UNIQUE CONSTRAINT prevents duplicate credit additions
        });

        if (logErr) {
            if (logErr.message.includes('unique constraint')) {
                console.log(`[Webhook] Credits for session ${session.id} already assigned. Skipping balance update.`);
                return;
            }
            throw new Error(`Failed to log credit purchase: ${logErr.message}`);
        }

        const { error: updateErr } = await supabase
            .from('users_profiles')
            .update({ 
                credits_balance: newBalance,
                last_credits_purchase_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateErr) throw new Error(`Failed to update user balance: ${updateErr.message}`);

        // Sync legacy table quietly
        await supabase.from('ai_credits').update({
            total_credits: (currentProfile.credits_balance || 0) + amount,
            updated_at: new Date().toISOString()
        }).eq('user_id', userId).catch(() => {});

        console.log(`[Webhook] ✅ ${amount} credits added to user ${userId}. New balance: ${newBalance}`);

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
