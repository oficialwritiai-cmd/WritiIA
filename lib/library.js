import { createSupabaseClient } from './supabase';
const supabase = createSupabaseClient();

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
export async function saveToLibrary({ userId, type, platform, goal, content, metadata = {}, tags = [], titulo = '' }) {
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
            titulo,
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
