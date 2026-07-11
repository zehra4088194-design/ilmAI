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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('questions').delete().eq('id', id);
  if (error) {
    console.error('question delete error:', error);
    return NextResponse.json({ error: 'Question delete nahi hua' }, { status: 500 });
  }

  try { await adminClient.rpc('refresh_subject_counts'); } catch {}

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (typeof body.is_demo_eligible === 'boolean') updates.is_demo_eligible = body.is_demo_eligible;
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'No valid update fields' }, { status: 400 });

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('questions').update(updates as any).eq('id', id).select('*').single();
  if (error) {
    console.error('question update error:', error);
    return NextResponse.json({ error: 'Question update nahi hua' }, { status: 500 });
  }

  return NextResponse.json({ question: data });
}
