import { NextRequest, NextResponse } from 'next/server';
import { processQueuedResourceContexts } from '@/lib/resources/processing';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // 5 is the function's own internal cap (see processQueuedResourceContexts) — process a full
    // batch per 5-minute tick instead of one at a time, so a backlog (e.g. a bulk re-processing
    // pass) drains in a reasonable time instead of trickling in for days.
    const results = await processQueuedResourceContexts(5);
    return NextResponse.json({ status: 'success', processed: results.length, results });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Resource OCR worker failed' },
      { status: 500 }
    );
  }
}
