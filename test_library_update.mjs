import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- ULTIMOS 3 SLOTS ---');
    const { data: slots } = await supabase.from('content_slots').select('id, idea_title, script_id, updated_at, metadata').order('updated_at', { ascending: false }).limit(3);
    console.log(JSON.stringify(slots, null, 2));

    console.log('\n--- ULTIMOS 3 SCRIPTS ---');
    const { data: scripts } = await supabase.from('scripts').select('id, slot_id, title, updated_at').order('updated_at', { ascending: false }).limit(3);
    console.log(JSON.stringify(scripts, null, 2));

    console.log('\n--- ULTIMAS 3 ENTRADAS EN LIBRARY ---');
    const { data: lib } = await supabase.from('library').select('id, metadata, titulo, updated_at, script_full_text').order('updated_at', { ascending: false }).limit(3);
    
    // Mostremos solo el inicio del texto para no inundar el terminal
    if (lib) {
        lib.forEach(l => {
            if (l.script_full_text) l.script_full_text = l.script_full_text.substring(0, 50) + '...';
        });
    }
    console.log(JSON.stringify(lib, null, 2));
}

run();
