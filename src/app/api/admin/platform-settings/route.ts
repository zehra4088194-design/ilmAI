import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { getPlatformSettings, savePlatformSettings } from '@/lib/platform-settings/server';
import { normalizePlatformSettings } from '@/lib/platform-settings/shared';

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const settings = await getPlatformSettings();
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const settings = normalizePlatformSettings(body?.settings || body);
    const saved = await savePlatformSettings(settings, admin.id);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    console.error('platform settings save error:', error);
    return NextResponse.json({ error: 'Settings could not be saved. Confirm that the required migration has run.' }, { status: 500 });
  }
}
