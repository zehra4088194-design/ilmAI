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
    const results = await processQueuedResourceContexts(1);
    return NextResponse.json({ status: 'success', processed: results.length, results });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Resource OCR worker failed' },
      { status: 500 }
    );
  }
}
