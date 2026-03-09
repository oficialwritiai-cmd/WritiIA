const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    const { data, error } = await supabase
        .from('library')
        .select('*')
        .eq('type', 'idea')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    fs.writeFileSync('output.json', JSON.stringify(data, null, 2), 'utf8');
    console.log('Saved to output.json');
}

run();
