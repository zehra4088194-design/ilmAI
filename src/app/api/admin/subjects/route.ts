import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('subjects').select('id, name, boards, grade_levels').order('name');

  if (error) return NextResponse.json({ error: 'Subjects load nahi hue' }, { status: 500 });
  return NextResponse.json({ subjects: data });
}
