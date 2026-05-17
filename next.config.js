const { withSentryConfig } = require('@sentry/nextjs');

// SECURITY: Content Security Policy
// 'unsafe-eval' is added only in development for Next.js HMR/Fast Refresh.
// Production keeps it excluded to prevent XSS/code injection attacks.
const isDev = process.env.NODE_ENV === 'development';
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' data: https://fonts.gstatic.com;
    img-src 'self' blob: data: https:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.stripe.com https://*.sentry.io https://app.posthog.com https://eu.posthog.com;
    media-src 'self' https://d8j0ntlcm91z4.cloudfront.net;
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
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()' },
                    // Content Security Policy
                    { key: 'Content-Security-Policy', value: cspHeader.replace(/\n/g, '').replace(/\s+/g, ' ').trim() }
                ]
            }
        ];
    }
};

module.exports = withSentryConfig(nextConfig, {
    // Sentry build-time options
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    // Disable source map upload in development to avoid noise
    disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
    disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',
});
