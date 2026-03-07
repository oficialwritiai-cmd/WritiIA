/**
 * lib/rate-limit.js
 * ─────────────────────────────────────────────────────────────
 * Enhanced in-memory rate limiter using LRU cache.
 *
 * Supports:
 * - IP-based limiting for public endpoints
 * - Compound IP:userId keys for authenticated endpoints
 * - Retry-After header on 429 responses
 * - Logging of abuse attempts
 * ─────────────────────────────────────────────────────────────
 */

import { LRUCache } from 'lru-cache';

export default function rateLimit(options = {}) {
    const interval = options.interval || 60_000; // 1 minute default
    const max = options.uniqueTokenPerInterval || 500;

    const tokenCache = new LRUCache({
        max,
        ttl: interval,
    });

    return {
        /**
         * @param {Response} response - NextResponse object to set headers on
         * @param {number} limit - Max allowed requests in the window
         * @param {string} token - Unique identifier (IP or "ip:userId")
         */
        check: (response, limit, token) =>
            new Promise((resolve, reject) => {
                const key = typeof token === 'object' ? JSON.stringify(token) : String(token);
                const tokenCount = tokenCache.get(key) || [0];

                if (tokenCount[0] === 0) {
                    tokenCache.set(key, tokenCount);
                }
                tokenCount[0] += 1;

                const currentUsage = tokenCount[0];
                const isRateLimited = currentUsage > limit;
                const remaining = isRateLimited ? 0 : limit - currentUsage;
                const retryAfterSeconds = Math.ceil(interval / 1000);

                // Security headers on every response
                response.headers.set('X-RateLimit-Limit', String(limit));
                response.headers.set('X-RateLimit-Remaining', String(remaining));
                response.headers.set('X-RateLimit-Reset', String(Date.now() + interval));

                if (isRateLimited) {
                    response.headers.set('Retry-After', String(retryAfterSeconds));

                    // Sanitized log: never include full user content, only the key to identify abusers
                    console.warn(
                        `[SECURITY][RateLimit] Exceeded | key="${key.substring(0, 64)}" | usage=${currentUsage}/${limit}`
                    );

                    return reject({
                        status: 429,
                        error: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.',
                    });
                }

                resolve();
            }),
    };
}

/**
 * Builds a compound rate-limit key combining IP and optional userId.
 * Use this for authenticated endpoints to bind limits to the user session,
 * not just the IP (prevents IP rotation attacks).
 *
 * @param {string} ip
 * @param {string|null} userId
 * @returns {string}
 */
export function buildRateLimitKey(ip, userId = null) {
    const safeIp = (ip || '127.0.0.1').split(',')[0].trim(); // Use first IP if forwarded chain
    return userId ? `${safeIp}:${userId}` : safeIp;
}
