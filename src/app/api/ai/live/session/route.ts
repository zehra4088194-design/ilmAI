import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST() {
  return NextResponse.json(
    {
      status: 'error',
      error: 'Live Voice Call abhi coming soon hai. Jab stable production flow ready hoga to yahin unlock hoga.',
    },
    { status: 503 },
  );
}
