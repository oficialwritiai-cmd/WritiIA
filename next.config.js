// SECURITY: Content Security Policy
// Note: 'unsafe-inline' is required by Next.js for internal scripts/styles.
// 'unsafe-eval' has been REMOVED — it was unnecessary and widened XSS attack surface.
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' data: https://fonts.gstatic.com;
    img-src 'self' blob: data: https:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.stripe.com;
    upgrade-insecure-requests;
`;

/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    // Prevent DNS prefetch leakage
                    { key: 'X-DNS-Prefetch-Control', value: 'on' },
                    // HSTS: force HTTPS for 2 years including subdomains
                    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
                    // Legacy XSS filter (deprecated but harmless)
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                    // Prevent clickjacking via iframes
                    { key: 'X-Frame-Options', value: 'DENY' },
                    // Prevent MIME-type sniffing
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    // Limit referer information leakage
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    // Restrict dangerous browser features (microphone, camera, geolocation)
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
                    // Content Security Policy (removed unsafe-eval)
                    { key: 'Content-Security-Policy', value: cspHeader.replace(/\n/g, '').replace(/\s+/g, ' ').trim() }
                ]
            }
        ];
    }
};

module.exports = nextConfig;
