import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST() {
  return NextResponse.json(
    {
      status: 'error',
      error: 'Live Voice Call is coming soon and will unlock here when the production flow is ready.',
    },
    { status: 503 },
  );
}
