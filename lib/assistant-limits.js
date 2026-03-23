/**
 * WRITI AI — Assistant Rate Limiting & Token Tracking
 * v1.0.0
 */

// Configurable Limits
export const ASSISTANT_LIMITS = {
    MESSAGES_PER_WINDOW: 30,    // Messages allowed in the window
    WINDOW_HOURS: 3,           // Window duration in hours
    DAILY_TOKEN_CAP: 50000,    // daily token limit per user (approx)
};

/**
 * Checks if a user has exceeded their assistant message quota.
 * 
 * @param {object} supabase - Service role supabase client
 * @param {string} userId - The user's UUID
 * @returns {Promise<{allowed: boolean, reason?: string, waitMinutes?: number}>}
 */
export async function checkAssistantLimit(supabase, userId) {
    try {
        const now = new Date();
        const windowDurationMs = ASSISTANT_LIMITS.WINDOW_HOURS * 60 * 60 * 1000;

        // 1. Get or create stats record
        let { data: stats, error } = await supabase
            .from('assistant_usage_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
            console.error('[checkAssistantLimit] Error fetching stats:', error);
            return { allowed: true }; // Fail open to not block users on DB error
        }

        // 2. Initialize if new user
        if (!stats) {
            const { data: newStats, error: createError } = await supabase
                .from('assistant_usage_stats')
                .insert({
                    user_id: userId,
                    window_start: now.toISOString(),
                    message_count: 0,
                    daily_tokens: 0
                })
                .select()
                .single();
            
            if (createError) return { allowed: true };
            stats = newStats;
        }

        // 3. Reset window if expired
        const windowStart = new Date(stats.window_start);
        const timeSinceWindowStart = now - windowStart;

        if (timeSinceWindowStart > windowDurationMs) {
            // Reset for a new window
            stats.window_start = now.toISOString();
            stats.message_count = 0;
            // Note: daily_tokens reset logic could be added here if window == 24h, 
            // but usually we track daily tokens separately or just reset at midnight UTC.
            // For now, let's just reset the message count window.
            
            await supabase
                .from('assistant_usage_stats')
                .update({
                    window_start: stats.window_start,
                    message_count: 0,
                    updated_at: now.toISOString()
                })
                .eq('user_id', userId);
        }

        // 4. Check message count
        if (stats.message_count >= ASSISTANT_LIMITS.MESSAGES_PER_WINDOW) {
            const waitMs = windowDurationMs - (now - windowStart);
            const waitMinutes = Math.ceil(waitMs / (1000 * 60));
            
            return {
                allowed: false,
                reason: 'WINDOW_LIMIT_REACHED',
                waitMinutes
            };
        }

        // 5. Check daily tokens (optional, but requested)
        // If daily_tokens reset is needed, we should check if 'updated_at' is from a previous day
        const lastUpdate = new Date(stats.updated_at);
        if (lastUpdate.getUTCDate() !== now.getUTCDate()) {
            stats.daily_tokens = 0;
            // Update immediately to clear tokens for the day
            await supabase
                .from('assistant_usage_stats')
                .update({ daily_tokens: 0 })
                .eq('user_id', userId);
        }

        if (stats.daily_tokens >= ASSISTANT_LIMITS.DAILY_TOKEN_CAP) {
            return {
                allowed: false,
                reason: 'DAILY_CAP_REACHED'
            };
        }

        return { allowed: true };

    } catch (err) {
        console.error('[checkAssistantLimit] Critical error:', err);
        return { allowed: true };
    }
}

/**
 * Increments usage after a successful AI response.
 */
export async function incrementAssistantUsage(supabase, userId, tokens = 0) {
    try {
        const { data, error } = await supabase.rpc('increment_assistant_usage', {
            u_id: userId,
            t_count: tokens
        });

        if (error) {
            // Fallback if RPC doesn't exist
            const { data: stats } = await supabase
                .from('assistant_usage_stats')
                .select('message_count, daily_tokens')
                .eq('user_id', userId)
                .single();
            
            if (stats) {
                await supabase
                    .from('assistant_usage_stats')
                    .update({
                        message_count: stats.message_count + 1,
                        daily_tokens: stats.daily_tokens + tokens,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', userId);
            }
        }
    } catch (err) {
        console.error('[incrementAssistantUsage] Error:', err);
    }
}
