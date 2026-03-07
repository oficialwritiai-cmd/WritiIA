/**
 * lib/auth-guard.js
 * ─────────────────────────────────────────────────────────────
 * Server-side session verification helpers.
 * 
 * SECURITY: Never trust userId from request body.
 * Always verify the Supabase JWT from the Authorization header.
 * ─────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Verifies the JWT in the Authorization header and returns the
 * authenticated user. Returns null if the token is invalid or missing.
 *
 * @param {Request} request - Incoming Next.js/Node request
 * @returns {Promise<{user: object|null, supabase: object}>}
 */
export async function getServerSession(request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return { user: null, supabase };
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return { user: null, supabase };
        }
        return { user, supabase };
    } catch {
        return { user: null, supabase };
    }
}

/**
 * Checks if the authenticated user has admin privileges.
 * @param {object} supabase - Supabase service client
 * @param {string} userId - Verified user ID
 * @returns {Promise<boolean>}
 */
export async function isAdmin(supabase, userId) {
    if (!userId) return false;
    const { data } = await supabase
        .from('users_profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
    return !!data?.is_admin;
}

/**
 * Returns a standardized 401 Unauthorized response.
 */
export function unauthorized(message = 'No autorizado.') {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Returns a standardized 403 Forbidden response.
 */
export function forbidden(message = 'Acceso denegado.') {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: message }, { status: 403 });
}
