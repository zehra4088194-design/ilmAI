import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

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

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('subjects').select('id, name, boards, grade_levels').order('name');

  if (error) return NextResponse.json({ error: 'Subjects load nahi hue' }, { status: 500 });
  return NextResponse.json({ subjects: data });
}
