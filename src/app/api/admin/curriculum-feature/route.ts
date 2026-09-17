import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { isCurriculumEnabled, setCurriculumEnabled } from '@/lib/features/curriculum';

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json({ enabled: await isCurriculumEnabled() });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    if (typeof body?.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean.' }, { status: 400 });
    }

    const enabled = await setCurriculumEnabled(body.enabled, admin.id);
    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('curriculum feature toggle error:', error);
    return NextResponse.json({ error: 'Curriculum feature setting could not be saved.' }, { status: 500 });
  }
}
