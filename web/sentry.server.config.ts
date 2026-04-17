import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV !== 'production',

  // Filter out common non-actionable errors
  beforeSend(event) {
    const errorMessagesToIgnore = [
      'Network Error',
      'Failed to fetch',
      'AbortError',
      'ResizeObserver loop limit exceeded',
    ];

    if (event.exception?.values?.[0]?.value) {
      const errorMessage = event.exception.values[0].value;
      if (errorMessagesToIgnore.some(msg => errorMessage.includes(msg))) {
        return null;
      }
    }

    return event;
  },
});
