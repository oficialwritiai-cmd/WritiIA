import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Saves generated content to the library.
 * @param {Object} params
 * @param {string} params.userId - The user ID.
 * @param {string} params.type - Type of content ('guion', 'idea', 'mensual').
 * @param {string} params.platform - The social media platform.
 * @param {string} params.goal - The goal of the content.
 * @param {Object} params.content - The actual generated content.
 * @param {Object} params.metadata - Additional metadata (hooks, vibes, etc).
 * @param {string[]} params.tags - List of tags.
 */
export async function saveToLibrary({ userId, type, platform, goal, content, metadata = {}, tags = [] }) {
    const { data, error } = await supabase
        .from('library')
        .insert({
            user_id: userId,
            type,
            platform,
            goal,
            content,
            metadata,
            tags,
            status: 'borrador'
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving to library:', error);
        throw error;
    }

    return data;
}
