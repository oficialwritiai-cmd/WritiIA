/**
 * ============================================================
 * WRITI AI — Unified Credit System v2.0
 * ============================================================
 * This is the single source of truth for credit costs and usage.
 * ALL AI actions in the app MUST go through `chargeCredits` before
 * calling any AI model.
 * ============================================================
 */

// ─── Credit Costs per Action ───────────────────────────────
// Edit these values to adjust pricing. DO NOT hardcode costs
// anywhere else in the codebase.
export const CREDIT_COSTS = {
    // Plans
    GENERATE_PLAN: 4,            // Monthly plan — default (12 ideas)
    GENERATE_PLAN_30: 8,         // Monthly plan — 30 ideas

    // Scripts
    GENERATE_SCRIPTS: 1,         // Base cost per script (multiplied by duration/count in getScriptCost)
    GENERATE_SCRIPT_SLOT: 1,     // Generate script from calendar slot

    // Ideas
    GENERATE_IDEAS: 1,           // Ideas from the idea generator
    IDEAS_EXTRA: 1,              // Extra ideas for an existing plan

    // Editing & Polish
    POLISH: 1,                   // Polish / rewrite text blocks
    REFINE: 1,                   // Refine / improve existing content
    IMPROVE_SCRIPT: 1,           // In-editor AI script improvement
    HUMANIZE_SCRIPT: 1,         // Humanize/rewrite a script to sound less robotic

    // Extras
    GENERATE_ADS: 4,             // Ads campaign plan
    GENERATE_BRAIN: 2,           // Generate brand brain from scratch
    GENERATE_HOOKS_ONLY: 1,      // Copy/hook-only generation (copys route)

    // Assistant Chat (Free for now as requested)
    ASSISTANT_CHAT: 0,           

    // Free Auxiliaries (no credit cost — these are helpers, not generators)
    SUGGEST_PLANNING: 0,         // Suggest optimal publication date
    ANALYZE_BRIEF: 0,            // Analyze plan brief (3-line summary)
    TRAIN_BRAIN: 0,              // Feedback training for the brain (no generative output cost)
};

// ─── Subscription Credit Packages ──────────────────────────
export const TRIAL_INITIAL_CREDITS = 50;    // Given on trial start
export const PRO_MONTHLY_CREDITS = 60;      // Given on each monthly renewal (reset)

// ─── Script Cost by Duration ────────────────────────────────
/**
 * Calculates the credit cost for a script based on its duration.
 * Scale:
 *  <= 60 seg: 1 credit
 *  90 seg / 2 min: 2 credits
 *  3 min: 3 credits
 *  5 min: 4 credits
 */
export function getScriptCost(duration, count = 1) {
    let baseCost = 1;
    if (duration === '90 seg' || duration === '2 min') baseCost = 2;
    if (duration === '3 min') baseCost = 3;
    if (duration === '5 min') baseCost = 4;
    return baseCost * count;
}

// ─── chargeCredits ──────────────────────────────────────────
/**
 * Atomically deducts credits and logs the usage.
 * Uses the Supabase RPC `decrement_credits_balance` for total transactional control.
 *
 * @param {object} supabase - Authenticated Supabase client (Service Role for bypassing RLS on backend)
 * @param {string} userId - UUID of the user
 * @param {number} amount - Credits to deduct
 * @param {string} actionType - Action type for logging (v2.0)
 * @param {string|null} projectId - Optional project UUID
 * @returns {Promise<{success: boolean, newBalance?: number, error?: string}>}
 */
export async function chargeCredits(supabase, userId, amount, actionType, projectId = null) {
    try {
        console.log(`[chargeCredits] ${actionType} — ${amount} credits for user ${userId}`);

        // Skip if cost is 0 (free action)
        if (amount === 0) return { success: true, newBalance: null };

        // ─────────────────────────────────────────────────────────────
        // v1.17.8: ADMIN BYPASS
        // Admins are not blocked even if credits are zero.
        // We still call the RPC to record the usage history.
        // ─────────────────────────────────────────────────────────────
        const { data: profile } = await supabase.from('users_profiles').select('is_admin').eq('id', userId).single();
        const isAdmin = !!profile?.is_admin;

        const { data, error } = await supabase.rpc('decrement_credits_balance', {
            u_id: userId,
            amount: Number(amount),
            action_type: actionType,
            p_id: projectId,
        });

        if (error) {
            console.error(`[chargeCredits] RPC error for ${userId}:`, error.message);
            
            // If admin, bypass "Insufficient credits" error and allow to proceed
            if (isAdmin) {
                console.log(`[chargeCredits] Admin ${userId} bypassed RPC error (or insufficient credits).`);
                return { success: true, newBalance: 0 };
            }
            return { success: false, error: error.message };
        }

        if (!data?.success) {
            const reason = data?.error || 'INSUFFICIENT_CREDITS';
            console.warn(`[chargeCredits] Denied for ${userId}: ${reason}`);
            
            if (isAdmin) {
                console.log(`[chargeCredits] Admin ${userId} bypassed insufficient credits check.`);
                return { success: true, newBalance: 0 };
            }
            return { success: false, error: reason };
        }

        console.log(`[chargeCredits] ✅ Charged ${amount} | New balance: ${data.new_balance}`);
        return { success: true, newBalance: data.new_balance };

    } catch (err) {
        console.error(`[chargeCredits] Critical error for ${userId}:`, err);
        return { success: false, error: 'INTERNAL_ERROR' };
    }
}

// ─── checkSubscriptionStatus ────────────────────────────────
/**
 * Checks if a user is allowed to run AI actions based on their subscription state.
 * States and permissions:
 *  - trial:           allowed (uses trial credits)
 *  - active:          allowed (monthly quota)
 *  - grace:           allowed (uses remaining balance only — no new credits added)
 *  - paused/canceled/expired_trial: blocked if balance == 0; allowed if they have extra purchased credits
 *
 * @param {object} supabase - Authenticated Supabase client
 * @param {string} userId - The user's UUID
 * @returns {Promise<{canUseAI: boolean, status: string, creditsBalance: number, reason?: string}>}
 */
export async function checkSubscriptionStatus(supabase, userId) {
    const { data: profile, error } = await supabase
        .from('users_profiles')
        .select('subscription_status, credits_balance, plan, trial_active, trial_ends_at')
        .eq('id', userId)
        .single();

    if (error || !profile) {
        return { canUseAI: false, status: 'unknown', creditsBalance: 0, reason: 'PROFILE_NOT_FOUND' };
    }

    const status = profile.subscription_status || 'trial';
    const balance = Number(profile.credits_balance) || 0;
    const blockedStates = ['paused', 'canceled', 'expired_trial', 'unpaid'];

    // If on a blocked state, can only use AI if they have extra purchased credits
    if (blockedStates.includes(status) && balance <= 0) {
        return {
            canUseAI: false,
            status,
            creditsBalance: balance,
            reason: 'NO_ACTIVE_PLAN'
        };
    }

    return { canUseAI: true, status, creditsBalance: balance };
}
