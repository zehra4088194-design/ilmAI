import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import {
  getAiRuntimeSettings,
  normalizeAiRuntimeSettings,
  saveAiRuntimeSettings,
} from '@/lib/ai/runtime-settings';

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ settings: await getAiRuntimeSettings() });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const settings = normalizeAiRuntimeSettings(body?.settings || body);
    const saved = await saveAiRuntimeSettings(settings, admin.id);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    console.error('AI runtime settings save error:', error);
    return NextResponse.json({ error: 'AI runtime settings could not be saved.' }, { status: 500 });
  }
}
