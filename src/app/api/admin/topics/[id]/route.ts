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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as { name?: string; content?: string; orderIndex?: number; isActive?: boolean };
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.content !== undefined) update.content = body.content;
  if (body.orderIndex !== undefined) update.order_index = body.orderIndex;
  if (body.isActive !== undefined) update.is_active = body.isActive;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Koi field update ke liye nahi diya' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await (adminClient.from('topics') as any).update(update).eq('id', id).select().single();
  if (error) {
    console.error('topic update error:', error);
    return NextResponse.json({ error: 'Topic update nahi hua' }, { status: 500 });
  }

  return NextResponse.json({ topic: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('topics').delete().eq('id', id);
  if (error) {
    console.error('topic delete error:', error);
    return NextResponse.json({ error: 'Topic delete nahi hua' }, { status: 500 });
  }

  try { await adminClient.rpc('refresh_subject_counts'); } catch {}

  return NextResponse.json({ success: true });
}
