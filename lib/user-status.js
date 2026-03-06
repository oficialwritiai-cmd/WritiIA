import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TRIAL_DAYS = 7;

export async function getUserStatus(userId) {
    if (!userId) {
        return {
            credits: 0,
            trialActive: false,
            trialDaysRemaining: 0,
            hasActivePlan: false,
            canUseAI: false
        };
    }

    const { data: profile, error } = await supabase
        .from('users_profiles')
        .select('credits_balance, trial_active, trial_started_at, stripe_customer_id, subscription_status')
        .eq('id', userId)
        .single();

    if (error || !profile) {
        console.error('Error getting user status:', error);
        return {
            credits: 0,
            trialActive: false,
            trialDaysRemaining: 0,
            hasActivePlan: false,
            canUseAI: false
        };
    }

    let trialActive = profile.trial_active || false;
    let trialDaysRemaining = 0;

    if (trialActive && profile.trial_started_at) {
        const trialStart = new Date(profile.trial_started_at);
        const now = new Date();
        const daysPassed = Math.floor((now - trialStart) / (1000 * 60 * 60 * 24));
        trialDaysRemaining = Math.max(0, TRIAL_DAYS - daysPassed);

        if (trialDaysRemaining <= 0) {
            trialActive = false;
            await supabase
                .from('users_profiles')
                .update({ trial_active: false })
                .eq('id', userId);
        }
    }

    const hasActivePlan = profile.subscription_status === 'active' || 
                          profile.subscription_status === 'trialing';

    const credits = profile.credits_balance || 0;
    const canUseAI = credits > 0 || trialActive || hasActivePlan;

    return {
        credits,
        trialActive,
        trialDaysRemaining,
        hasActivePlan,
        canUseAI
    };
}

export async function validateAccessKey(keyValue, userId) {
    if (!keyValue || !userId) {
        return { success: false, error: 'Invalid parameters' };
    }

    const { data: accessKey, error } = await supabase
        .from('access_keys')
        .select('*')
        .eq('key_value', keyValue)
        .eq('is_active', true)
        .single();

    if (error || !accessKey) {
        return { success: false, error: 'Invalid access key' };
    }

    if (accessKey.expires_at && new Date(accessKey.expires_at) < new Date()) {
        return { success: false, error: 'Access key has expired' };
    }

    if (accessKey.uses_count >= accessKey.max_uses) {
        return { success: false, error: 'Access key has reached maximum uses' };
    }

    await supabase
        .from('access_keys')
        .update({ uses_count: accessKey.uses_count + 1 })
        .eq('id', accessKey.id);

    const creditsToAdd = accessKey.credits_amount || 200;
    const trialDays = accessKey.trial_days || TRIAL_DAYS;

    const { data: currentProfile } = await supabase
        .from('users_profiles')
        .select('credits_balance')
        .eq('id', userId)
        .single();

    const newCredits = (currentProfile?.credits_balance || 0) + creditsToAdd;

    await supabase
        .from('users_profiles')
        .update({
            credits_balance: newCredits,
            trial_active: true,
            trial_started_at: new Date().toISOString(),
            access_key_used: keyValue
        })
        .eq('id', userId);

    return {
        success: true,
        creditsAdded: creditsToAdd,
        trialDays
    };
}

export async function checkAndExpireTrial(userId) {
    const { data: profile } = await supabase
        .from('users_profiles')
        .select('trial_active, trial_started_at')
        .eq('id', userId)
        .single();

    if (profile?.trial_active && profile?.trial_started_at) {
        const trialStart = new Date(profile.trial_started_at);
        const now = new Date();
        const daysPassed = Math.floor((now - trialStart) / (1000 * 60 * 60 * 24));

        if (daysPassed >= TRIAL_DAYS) {
            await supabase
                .from('users_profiles')
                .update({ trial_active: false })
                .eq('id', userId);
        }
    }
}
