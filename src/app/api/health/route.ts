import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // TEMP DIAGNOSTIC — Coolify Terminal is unavailable, so this is the only way
  // to see whether the container healthcheck request is even reaching the
  // Next.js server. Remove once the deploy healthcheck issue is root-caused.
  console.log(
    `[health] hit at ${new Date().toISOString()} rss=${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`
  );
  return NextResponse.json(
    {
      status: 'ok',
      service: 'ilm-ai-web',
      version: process.env.NEXT_PUBLIC_APP_VERSION || 'development',
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
