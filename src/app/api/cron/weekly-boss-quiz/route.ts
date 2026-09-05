import { NextRequest, NextResponse } from 'next/server';
import { createWeeklyBossQuizzesIfMissing } from '@/lib/competitions/create';

export const runtime = 'nodejs';
export const maxDuration = 60;

// One boss quiz per active subject per week — idempotent (skips subjects that already have a row
// for the current week), so safe alongside the existing weekly-league-rollover Monday slot.
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const results = await createWeeklyBossQuizzesIfMissing();
    return NextResponse.json({ status: 'ok', created: results.filter((r) => r.created).length, results });
  } catch (error) {
    console.error('Weekly boss quiz cron failed:', error);
    return NextResponse.json({ status: 'error', error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
