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
    // Reverted to 1: with the AI gateway currently timing out frequently (~90s per call), batching
    // multiple resources per tick risked the combined wall-clock time exceeding this route's
    // maxDuration (300s) and killing the whole request outright (observed live as repeated 500s
    // from the cron container, worse than the original slow-but-steady 1-per-tick pace).
    const results = await processQueuedResourceContexts(1);
    return NextResponse.json({ status: 'success', processed: results.length, results });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Resource OCR worker failed' },
      { status: 500 }
    );
  }
}
