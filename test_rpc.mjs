import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Testing API fetch...");
    const { data: users, error: fetchErr } = await supabase.from('users_profiles').select('id, credits_balance').limit(1);
    if (!users || users.length === 0) {
        console.log("No users found.", fetchErr);
        return;
    }
    const user = users[0];
    console.log("Found user:", user);

    console.log("Testing deposit_credits...");
    const { data, error } = await supabase.rpc('deposit_credits', {
        u_id: user.id,
        amount: 10
    });
    console.log('Result:', data, 'Error:', error);

    const { data: userAfter } = await supabase.from('users_profiles').select('credits_balance').eq('id', user.id).single();
    console.log("User credits after:", userAfter);
}

test();
