import { NextResponse } from 'next/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';

export async function GET() {
  const settings = await getPlatformSettings();
  return NextResponse.json({ settings });
}
