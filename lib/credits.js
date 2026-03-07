/**
 * Unified Credit System Utility
 * Handles credit checks and deductions transactionally via Supabase RPC.
 */

export const CREDIT_COSTS = {
    GENERATE_IDEAS: 1,
    GENERATE_SCRIPTS: 2,
    GENERATE_PLAN: 3,
    POLISH: 1,
    REFINE: 1,
    IDEAS_EXTRA: 1,
};

/**
 * Calculates the credit cost for a script based on duration.
 * Cost scale:
 * - <= 60 seg: 1 credit
 * - 61-120 seg (90 seg, 2 min): 2 credits
 * - 121-180 seg (3 min): 3 credits
 * - > 180 seg (5 min): 4 credits
 */
export function getScriptCost(duration, count = 1) {
    let baseCost = 1;
    if (duration === '90 seg' || duration === '2 min') baseCost = 2;
    if (duration === '3 min') baseCost = 3;
    if (duration === '5 min') baseCost = 4;
    return baseCost * count;
}

/**
 * Deducts credits from user's balance and logs usage.
 * @param {object} supabase - Authenticated Supabase client
 * @param {string} userId - User ID
 * @param {number} amount - Amount of credits to deduct
 * @param {string} actionType - Type of action (e.g., 'generate_ideas')
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function chargeCredits(supabase, userId, amount, actionType) {
    try {
        // Step 1: Use safe RPC to decrement balance (atomic)
        const { error: rpcError } = await supabase.rpc('decrement_credits_balance', {
            u_id: userId,
            amount: amount
        });

        if (rpcError) {
            console.error(`[chargeCredits] RPC Error for user ${userId}:`, rpcError);
            if (rpcError.message?.includes('Insufficient credits')) {
                return { success: false, error: 'NO_CREDITS' };
            }
            return { success: false, error: rpcError.message };
        }

        // Step 2: Log usage (fire and forget is okay here, but we await for consistency)
        const { error: logError } = await supabase.from('credits_usage').insert({
            user_id: userId,
            action_type: actionType,
            amount: amount
        });

        if (logError) {
            console.warn(`[chargeCredits] Warning: Could not log usage for ${userId}:`, logError);
            // We don't fail the whole operation if just logging fails, as credits were already deducted
        }

        return { success: true };
    } catch (err) {
        console.error(`[chargeCredits] Critical Error for user ${userId}:`, err);
        return { success: false, error: 'INTERNAL_ERROR' };
    }
}
