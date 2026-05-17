import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || 'https://e1a8949bd0b91d93a13ef286f2238841@o4511405664698368.ingest.de.sentry.io/4511405715030096',
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
