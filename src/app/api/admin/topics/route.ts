import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const chapterId = req.nextUrl.searchParams.get('chapterId');
  if (!chapterId) return NextResponse.json({ error: 'chapterId required hai' }, { status: 400 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient
    .from('topics')
    .select('id, name')
    .eq('chapter_id', chapterId)
    .order('order_index', { ascending: true });

  if (error) return NextResponse.json({ error: 'Topics load nahi hue' }, { status: 500 });
  return NextResponse.json({ topics: data });
}
