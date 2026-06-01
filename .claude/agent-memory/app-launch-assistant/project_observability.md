---
name: WRITI.AI Observability Stack
description: Sentry, PostHog, and internal logs system — file locations, env vars required, and CSP rules added
type: project
---

Observability stack added 2026-05-17. All files are live in production.

## Files created
- `sentry.client.config.js` — Sentry client init (reads NEXT_PUBLIC_SENTRY_DSN)
- `sentry.server.config.js` — Sentry server init (reads SENTRY_DSN)
- `app/components/SentryErrorBoundary.js` — class component, wraps children, calls Sentry.captureException
- `app/components/PostHogProvider.js` — 'use client', wraps body in PHProvider, init inside useEffect
- `lib/analytics.js` — typed Analytics object: cerebroIniciado, cerebroCompletado, ideasGeneradas, guionGenerado, guionGuardadoBiblioteca, sesionMatrixCompletada, calendarioAbierto, creditosAgotados, identificarUsuario
- `lib/logger.js` — logEvent(action, metadata, errorMessage, userId) — fires POST /api/logs silently
- `app/api/logs/route.js` — POST inserts to app_logs table; GET returns last 200 logs (admin-only, checks profiles.email)
- `app/admin/logs/page.js` — admin UI, auto-refresh every 15s, filter by action/error/user_id

## Files modified
- `next.config.js` — wrapped with withSentryConfig; added https://*.sentry.io and https://app.posthog.com to connect-src CSP
- `app/layout.js` — PostHogProvider wraps <Providers> and <SupportWidget> inside <body>

## Env vars needed in Vercel
- NEXT_PUBLIC_SENTRY_DSN
- SENTRY_DSN
- SENTRY_ORG
- SENTRY_PROJECT
- NEXT_PUBLIC_POSTHOG_KEY
- NEXT_PUBLIC_POSTHOG_HOST (optional, defaults to https://app.posthog.com)
- ADMIN_EMAIL (defaults to ss.companyes@gmail.com)
- SUPABASE_SERVICE_ROLE_KEY (for logs API to bypass RLS)

## Sentry warnings (not errors)
- Build warns to move sentry.server.config.js content into instrumentation.ts register() — OK to ignore for now, build passes
- Build warns about no global-error.js — OK to ignore, not blocking

**Why:** User requested full observability before scaling traffic.
**How to apply:** When touching any of these files, check they still respect the no-Tailwind rule (all inline styles).
