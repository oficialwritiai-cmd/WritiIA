const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function cleanupLibrary() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting library cleanup...');

    const junkPatterns = [
        '%IdeaYouTube%',
        '%YouTubeventaventas%',
        '%sin título%',
        '%Idea TikTok%'
    ];

    for (const pattern of junkPatterns) {
        const { error, count } = await supabase
            .from('library')
            .delete({ count: 'exact' })
            .or(`titulo.ilike.${pattern}`);

        if (error) {
            console.error(`Error deleting pattern ${pattern}:`, error);
        } else {
            console.log(`Deleted ${count} items matching ${pattern}`);
        }
    }

    // Also delete items where content is essentially empty or just has platform name
    const { error: genericError, count: genericCount } = await supabase
        .from('library')
        .delete({ count: 'exact' })
        .is('titulo', null)
        .is('goal', null);

    if (genericError) {
        console.error('Error deleting generic items:', genericError);
    } else {
        console.log(`Deleted ${genericCount} generic items`);
    }

    console.log('Library cleanup complete.');
}

cleanupLibrary();
