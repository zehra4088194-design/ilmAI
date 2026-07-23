import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as { name?: string; content?: string; orderIndex?: number; isActive?: boolean };
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.content !== undefined) update.content = body.content;
  if (body.orderIndex !== undefined) update.order_index = body.orderIndex;
  if (body.isActive !== undefined) update.is_active = body.isActive;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields were provided for update' }, { status: 400 });
  }

  const adminClient = await createAdminClient();
  const { data, error } = await (adminClient.from('topics') as any).update(update).eq('id', id).select().single();
  if (error) {
    console.error('topic update error:', error);
    return NextResponse.json({ error: 'The topic could not be updated' }, { status: 500 });
  }

  return NextResponse.json({ topic: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('topics').delete().eq('id', id);
  if (error) {
    console.error('topic delete error:', error);
    return NextResponse.json({ error: 'The topic could not be deleted' }, { status: 500 });
  }

  try { await adminClient.rpc('refresh_subject_counts'); } catch {}

  return NextResponse.json({ success: true });
}
