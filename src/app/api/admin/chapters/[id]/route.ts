import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
    return null;
  }
  return user;
}

// PATCH /api/admin/chapters/:id
// body: any subset of { name, boards, gradeLevels, orderIndex, isActive }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as { name?: string; boards?: string[]; gradeLevels?: string[]; orderIndex?: number; isActive?: boolean };

  const update: Database['public']['Tables']['chapters']['Update'] = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.boards !== undefined) update.boards = body.boards;
  if (body.gradeLevels !== undefined) update.grade_levels = body.gradeLevels;
  if (body.orderIndex !== undefined) update.order_index = body.orderIndex;
  if (body.isActive !== undefined) update.is_active = body.isActive;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Koi field update ke liye nahi diya' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('chapters').update(update).eq('id', id).select().single();

  if (error) {
    console.error('chapter update error:', error);
    return NextResponse.json({ error: 'Chapter update nahi hua' }, { status: 500 });
  }

  return NextResponse.json({ chapter: data });
}

// DELETE /api/admin/chapters/:id
// Cascades to topics/questions under this chapter (see schema FKs) — the
// admin UI confirms with the user before calling this.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('chapters').delete().eq('id', id);

  if (error) {
    console.error('chapter delete error:', error);
    return NextResponse.json({ error: 'Chapter delete nahi hua' }, { status: 500 });
  }

  try { await adminClient.rpc('refresh_subject_counts'); } catch {}

  return NextResponse.json({ success: true });
}
