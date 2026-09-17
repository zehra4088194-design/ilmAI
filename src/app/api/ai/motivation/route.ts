import { NextResponse } from 'next/server';
import { MOTIVATION_QUOTES } from '@/lib/ai/motivation-quotes';

export const runtime = 'nodejs';

// Motivation is intentionally local/static. The app can rotate through this
// pool without calling any AI provider or consuming AI credits on each load.
export async function POST() {
  return NextResponse.json(
    { quotes: MOTIVATION_QUOTES, cached: true, aiUsed: false },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    }
  );
}
