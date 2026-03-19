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
export async function saveToLibrary({ id = null, userId, type, platform, goal, content, metadata = {}, tags = [], titulo = '', projectId = null, script_full_text = null }) {
    // If we have an ID, we update
    if (id) {
        const { data, error } = await supabase
            .from('library')
            .update({
                platform,
                goal,
                content,
                metadata,
                tags,
                titulo,
                script_full_text,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    }

    // Optional: Search for existing item with same title and project to prevent duplicates
    if (titulo && userId) {
        let query = supabase.from('library').select('id').eq('user_id', userId).eq('titulo', titulo).eq('type', type);
        if (projectId) query = query.eq('project_id', projectId);
        else query = query.is('project_id', null);

        const { data: existing } = await query.maybeSingle();
        if (existing) {
            // Found existing, update it instead
            return saveToLibrary({ id: existing.id, userId, type, platform, goal, content, metadata, tags, titulo, projectId, script_full_text });
        }
    }

    // Otherwise, insert new
    const { data, error } = await supabase
        .from('library')
        .insert({
            user_id: userId,
            project_id: projectId,
            type,
            platform,
            goal,
            content,
            metadata,
            tags,
            titulo,
            script_full_text,
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
