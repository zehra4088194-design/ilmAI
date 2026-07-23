import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import type { Database } from '@/lib/supabase/database.types';

type BoardType = Database['public']['Enums']['board_type'];
type GradeLevel = Database['public']['Enums']['grade_level'];

// PATCH /api/admin/chapters/:id
// body: any subset of { name, boards, gradeLevels, orderIndex, isActive }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as { name?: string; boards?: string[]; gradeLevels?: string[]; orderIndex?: number; isActive?: boolean };

  const update: Database['public']['Tables']['chapters']['Update'] = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.boards !== undefined) update.boards = body.boards as BoardType[];
  if (body.gradeLevels !== undefined) update.grade_levels = body.gradeLevels as GradeLevel[];
  if (body.orderIndex !== undefined) update.order_index = body.orderIndex;
  if (body.isActive !== undefined) update.is_active = body.isActive;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields were provided for update' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('chapters').update(update).eq('id', id).select().single();

  if (error) {
    console.error('chapter update error:', error);
    return NextResponse.json({ error: 'The chapter could not be updated' }, { status: 500 });
  }

  return NextResponse.json({ chapter: data });
}

// DELETE /api/admin/chapters/:id
// Cascades to topics/questions under this chapter (see schema FKs) — the
// admin UI confirms with the user before calling this.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('chapters').delete().eq('id', id);

  if (error) {
    console.error('chapter delete error:', error);
    return NextResponse.json({ error: 'The chapter could not be deleted' }, { status: 500 });
  }

  try { await adminClient.rpc('refresh_subject_counts'); } catch {}

  return NextResponse.json({ success: true });
}
