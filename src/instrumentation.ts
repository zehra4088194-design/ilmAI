import * as Sentry from '@sentry/nextjs';

export async function register() {
  // TEMP DIAGNOSTIC — see src/app/api/health/route.ts for why. Remove together.
  console.log(`[boot] instrumentation register() start, runtime=${process.env.NEXT_RUNTIME}`);

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }

  console.log('[boot] instrumentation register() done');
}

export const onRequestError = Sentry.captureRequestError;
