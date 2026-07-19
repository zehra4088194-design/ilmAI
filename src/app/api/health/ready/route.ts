import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

export async function GET() {
  const checks: Record<string, 'ok' | 'missing' | 'failed'> = {
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'ok' : 'missing',
    supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ok' : 'missing',
    ai_gateway: process.env.AI_GATEWAY_URL || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY ? 'ok' : 'missing',
  };
  try {
    const db = createServiceClient() as any;
    const { error } = await db.from('platform_settings').select('key').eq('key', 'subscription_plans').maybeSingle();
    checks.database = error ? 'failed' : 'ok';
  } catch {
    checks.database = 'failed';
  }
  const optionalProviders = {
    redis: Boolean(process.env.REDIS_URL),
    posthog: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    sentry: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
    firebase_push: Boolean(process.env.FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    r2: Boolean(
      process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET
    ),
    algolia: process.env.ALGOLIA_ENABLED === 'true' && Boolean(process.env.ALGOLIA_APP_ID),
  };
  const ready = Object.values(checks).every((value) => value === 'ok');
  return NextResponse.json(
    {
      status: ready ? 'ready' : 'not_ready',
      checks,
      optionalProviders,
      version: process.env.NEXT_PUBLIC_APP_VERSION || 'local',
    },
    { status: ready ? 200 : 503 }
  );
}
