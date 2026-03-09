import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.from('calendar_events').select('*').limit(1);
    if (error) {
        console.error("Error fetching:", error);
    } else {
        console.log("calendar_events columns:", data?.length > 0 ? Object.keys(data[0]) : "No rows found, but no error. Try selecting just one to see if row is empty.");

        // Attempt to insert with a fake column to see if it complains about 'content'
        const { error: insertErr } = await supabase.from('calendar_events').insert({
            title: "test", user_id: "00000000-0000-0000-0000-000000000000", content: { a: 1 }
        }).select();
        console.log("Insert with content JSONB error:", insertErr?.message || "Success");
    }
}

checkSchema();
