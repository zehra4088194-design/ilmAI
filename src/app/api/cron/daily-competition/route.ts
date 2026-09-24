import { NextRequest, NextResponse } from 'next/server';
import { createDailyCompetitionIfMissing } from '@/lib/competitions/create';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Called from .github/workflows/free-cron.yml on every run — idempotent (createDailyCompetitionIfMissing
// checks for an existing row covering "today" first), so it's safe to call more than once a day.
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await createDailyCompetitionIfMissing();
    return NextResponse.json({ status: 'ok', ...result });
  } catch (error) {
    console.error('Daily competition cron failed:', error);
    return NextResponse.json({ status: 'error', error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
