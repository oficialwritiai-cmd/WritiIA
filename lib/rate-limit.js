import { LRUCache } from 'lru-cache';

export default function rateLimit(options) {
    const tokenCache = new LRUCache({
        max: options?.uniqueTokenPerInterval || 500,
        ttl: options?.interval || 60000,
    });

    return {
        check: (response, limit, token) =>
            new Promise((resolve, reject) => {
                const key = typeof token === 'object' ? JSON.stringify(token) : token; // Usa JSON.stringify para objetos
                const tokenCount = tokenCache.get(key) || [0];
                if (tokenCount[0] === 0) {
                    tokenCache.set(key, tokenCount);
                }
                tokenCount[0] += 1;

                const currentUsage = tokenCount[0];
                const isRateLimited = currentUsage > limit;

                response.headers.set('X-RateLimit-Limit', limit);
                response.headers.set(
                    'X-RateLimit-Remaining',
                    isRateLimited ? 0 : limit - currentUsage
                );

                if (isRateLimited) {
                    console.warn(`[SECURITY] Rate limit exceeded by token: ${key} (Usage: ${currentUsage}/${limit})`);
                    return reject({ status: 429, error: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.' });
                }

                resolve();
            }),
    };
}
