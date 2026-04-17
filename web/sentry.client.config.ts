import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV !== 'production',

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out common non-actionable errors
  beforeSend(event) {
    // Filter out specific errors that are not actionable
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
