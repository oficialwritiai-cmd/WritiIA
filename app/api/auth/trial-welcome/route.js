import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTrialWelcomeEmail } from '@/lib/email';

export async function POST(req) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Fetch user profile and check if email already sent
        const { data: profile, error: profileError } = await supabase
            .from('users_profiles')
            .select('email, name, plan, trial_email_sent')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        if (profile.trial_email_sent) {
            return NextResponse.json({ message: 'Email already sent' });
        }

        if (profile.plan !== 'trial' && profile.plan !== 'pro') {
            return NextResponse.json({ error: 'User is not in trial or pro plan' }, { status: 403 });
        }

        if (profile.email) {
            const { success, reason } = await sendTrialWelcomeEmail(profile.email, profile.name);

            if (success) {
                await supabase
                    .from('users_profiles')
                    .update({ trial_email_sent: true })
                    .eq('id', userId);

                return NextResponse.json({ success: true });
            } else {
                return NextResponse.json({ error: reason }, { status: 500 });
            }
        }

        return NextResponse.json({ error: 'No email found' }, { status: 400 });

    } catch (error) {
        console.error('[API Trial Welcome] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
