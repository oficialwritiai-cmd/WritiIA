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
    IMPROVE_SCRIPT: 1, // mini-chat AI edit per script
    GENERATE_ADS: 4, // ads plan generation (v4.2.0)
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
export async function chargeCredits(supabase, userId, amount, actionType, projectId = null) {
    try {
        console.log(`[chargeCredits] Attempting to charge ${amount} for ${actionType} (User: ${userId})`);
        
        // Use the atomic RPC function: decrement_credits_balance(u_id, amount, action_type, p_id)
        const { data, error } = await supabase.rpc('decrement_credits_balance', {
            u_id: userId,
            amount: Number(amount),
            action_type: actionType,
            p_id: projectId
        });

        if (error) {
            console.error(`[chargeCredits] RPC Error for ${userId}:`, error.message);
            return { success: false, error: error.message };
        }

        if (!data.success) {
            console.warn(`[chargeCredits] Charge failed for ${userId}:`, data.error);
            return { success: false, error: data.error };
        }

        console.log(`[chargeCredits] Success! New balance: ${data.new_balance}`);
        return { success: true, newBalance: data.new_balance };
    } catch (err) {
        console.error(`[chargeCredits] Critical Error for user ${userId}:`, err);
        return { success: false, error: 'INTERNAL_ERROR' };
    }
}
