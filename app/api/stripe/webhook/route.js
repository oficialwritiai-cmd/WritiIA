import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { sendPlanActivationEmail, sendCreditsEmail, sendRenewalEmail, sendCancellationEmail } from '@/lib/email';
import { PRO_MONTHLY_CREDITS, TRIAL_INITIAL_CREDITS } from '@/lib/credits';

export const dynamic = 'force-dynamic';

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
}

// GET removed — diagnostic endpoint exposed env var status publicly

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
                await handleCheckoutCompleted(session, supabase, logEntry);
                break;
            }

            // ── Monthly Renewal: reset credits ──
            case 'invoice.paid': {
                const invoice = event.data.object;
                // Only handle subscription invoices (not one-time purchases)
                if (invoice.subscription) {
                    await handleInvoicePaid(invoice, supabase);
                }
                break;
            }

            // ── Payment Failed: enter grace period ──
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                await handleInvoicePaymentFailed(invoice, supabase);
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
async function handleCheckoutCompleted(session, supabase, logEntry = null) {
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
                email_confirm: true
            });

            if (authError) {
                console.error('[Webhook] Error creating user from pending:', authError);
                // If user already exists, it will be handled
                if (!authError.message.includes('already registered')) throw authError;
            } else {
                console.log('[Webhook] Successfully created user:', authUser.user.id);
                // Envía el correo de confirmación obligatoriamente
                const rawUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
                if (!rawUrl) {
                    console.error('[Webhook] NEXT_PUBLIC_APP_URL is not set — cannot send confirmation email with correct redirect URL.');
                    throw new Error('Missing NEXT_PUBLIC_APP_URL env var');
                }
                const anonClient = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
                );
                
                // Forzar el envío del correo de verificación llamando a resend
                await anonClient.auth.resend({
                    type: 'signup',
                    email: pending.email,
                    options: {
                        emailRedirectTo: `${rawUrl}/dashboard`
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

        // upsert (no update): si el usuario pago directo sin llave beta, este es
        // el PRIMER lugar donde se toca users_profiles para el — un UPDATE simple
        // no crea nada si la fila no existe (bug real que dejaba pagos cobrados
        // sin activar el acceso). upsert garantiza que la fila quede creada.
        const { error } = await supabase
            .from('users_profiles')
            .upsert({
                id: userId,
                email: userEmail || undefined,
                name: (userEmail || 'usuario').split('@')[0],
                plan: 'pro',
                subscription_status: 'active',
                stripe_customer_id: customerId,
                subscription_period_end: periodEnd,
                trial_active: false,
                credits_balance: PRO_MONTHLY_CREDITS,  // Assign monthly credits on first activation
                payment_failure_count: 0,
                grace_period_started_at: null,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

        if (error) {
            console.error('[Webhook] Error activating plan:', error);
            throw error;
        }

        // Log the activation in credits_usage
        await supabase.from('credits_usage').insert({
            user_id: userId,
            action_type: 'plan_activation',
            amount: PRO_MONTHLY_CREDITS,
            idempotency_key: `plan_activation_${session.id}`,
        }).catch(err => {
            if (!err.message?.includes('unique')) console.error('[Webhook] credits_usage log error:', err);
        });

        console.log(`[Webhook] ✅ Plan Pro activated for user ${userId} until ${periodEnd}. Credits: ${PRO_MONTHLY_CREDITS}`);


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

        // Atomic credit deposit via RPC (uses FOR UPDATE row-lock + idempotency check).
        // Prevents double-crediting if Stripe retries the webhook.
        const { data: rpcResult, error: rpcErr } = await supabase.rpc('add_credits_balance', {
            u_id: userId,
            amount,
            p_idempotency_key: `stripe_session_${session.id}`
        });

        if (rpcErr) throw new Error(`Failed to add credits: ${rpcErr.message}`);

        if (rpcResult?.skipped) {
            console.log(`[Webhook] Credits for session ${session.id} already assigned. Skipping.`);
            return;
        }

        const newBalance = rpcResult?.new_balance;
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

    // Send cancellation email
    const { data: userProfile } = await supabase
        .from('users_profiles')
        .select('email, name, subscription_period_end')
        .eq('id', profile.id)
        .single();
    if (userProfile?.email) {
        await sendCancellationEmail(
            userProfile.email,
            userProfile.name,
            userProfile.subscription_period_end
        ).catch(e => console.error('[Webhook] cancel email error:', e.message));
    }
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

// ─────────────────────────────────────────────
// Invoice Paid — Monthly Renewal: Reset Credits
// ─────────────────────────────────────────────
async function handleInvoicePaid(invoice, supabase) {
    const customerId = invoice.customer;
    console.log('[Webhook] invoice.paid for customer:', customerId);

    // Find user by stripe_customer_id
    const { data: profile, error: findError } = await supabase
        .from('users_profiles')
        .select('id, credits_balance')
        .eq('stripe_customer_id', customerId)
        .single();

    if (findError || !profile) {
        console.error('[Webhook] invoice.paid: Could not find user for customer:', customerId);
        return;
    }

    const periodEnd = invoice.lines?.data?.[0]?.period?.end
        ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
        : null;

    // Reset credits to monthly quota
    const { error } = await supabase
        .from('users_profiles')
        .update({
            credits_balance: PRO_MONTHLY_CREDITS,
            subscription_status: 'active',
            payment_failure_count: 0,
            grace_period_started_at: null,
            subscription_period_end: periodEnd,
            updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

    if (error) {
        console.error('[Webhook] invoice.paid: Error updating credits:', error);
        throw error;
    }

    // Log the renewal in credits_usage for auditability
    await supabase.from('credits_usage').insert({
        user_id: profile.id,
        action_type: 'monthly_renewal',
        amount: PRO_MONTHLY_CREDITS,
        idempotency_key: `invoice_paid_${invoice.id}`,
    }).catch(err => {
        // If idempotency duplicate, it means we already processed — safe to ignore
        if (!err.message?.includes('unique')) console.error('[Webhook] invoice.paid: log error:', err);
    });

    console.log(`[Webhook] ✅ Monthly credits reset to ${PRO_MONTHLY_CREDITS} for user ${profile.id}`);

    // Send renewal confirmation email
    const { data: userProfile } = await supabase
        .from('users_profiles')
        .select('email, name')
        .eq('id', profile.id)
        .single();
    if (userProfile?.email) {
        await sendRenewalEmail(userProfile.email, userProfile.name, periodEnd).catch(e =>
            console.error('[Webhook] invoice.paid: renewal email error:', e.message)
        );
    }
}

// ─────────────────────────────────────────────
// Invoice Payment Failed — Grace Period Logic
// ─────────────────────────────────────────────
async function handleInvoicePaymentFailed(invoice, supabase) {
    const customerId = invoice.customer;
    const attemptCount = invoice.attempt_count || 1;
    console.log(`[Webhook] invoice.payment_failed for customer: ${customerId}, attempt: ${attemptCount}`);

    const { data: profile, error: findError } = await supabase
        .from('users_profiles')
        .select('id, payment_failure_count, grace_period_started_at')
        .eq('stripe_customer_id', customerId)
        .single();

    if (findError || !profile) {
        console.error('[Webhook] payment_failed: Could not find user for customer:', customerId);
        return;
    }

    const newFailureCount = (profile.payment_failure_count || 0) + 1;
    const graceStarted = profile.grace_period_started_at ? new Date(profile.grace_period_started_at) : new Date();
    const daysSinceGrace = (Date.now() - graceStarted.getTime()) / (1000 * 60 * 60 * 24);

    // Determine new status:
    // After 3 failures OR more than 7 days in grace: pause the account
    let newStatus = 'grace';
    if (newFailureCount >= 3 || daysSinceGrace > 7) {
        newStatus = 'paused';
        console.warn(`[Webhook] User ${profile.id} exceeded grace limits. Moving to paused.`);
    }

    const updateData = {
        subscription_status: newStatus,
        payment_failure_count: newFailureCount,
        updated_at: new Date().toISOString(),
    };

    // Only set grace_period_started_at on first failure
    if (!profile.grace_period_started_at && newStatus === 'grace') {
        updateData.grace_period_started_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from('users_profiles')
        .update(updateData)
        .eq('id', profile.id);

    if (error) {
        console.error('[Webhook] payment_failed: Error updating user status:', error);
        throw error;
    }

    console.log(`[Webhook] ✅ User ${profile.id} → status: ${newStatus} (failure #${newFailureCount})`);
}
