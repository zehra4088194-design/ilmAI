import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings, savePlatformSettings } from '@/lib/platform-settings/server';
import { normalizePlatformSettings } from '@/lib/platform-settings/shared';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const settings = await getPlatformSettings();
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const settings = normalizePlatformSettings(body?.settings || body);
    const saved = await savePlatformSettings(settings, admin.id);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    console.error('platform settings save error:', error);
    return NextResponse.json({ error: 'Settings save nahi hui. Migration run hai ya nahi check karo.' }, { status: 500 });
  }
}
