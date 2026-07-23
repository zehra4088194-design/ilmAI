import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const adminClient = await createAdminClient();
  const { error } = await adminClient.from('questions').delete().eq('id', id);
  if (error) {
    console.error('question delete error:', error);
    return NextResponse.json({ error: 'The question could not be deleted' }, { status: 500 });
  }

  try { await adminClient.rpc('refresh_subject_counts'); } catch {}

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
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
    return NextResponse.json({ error: 'The question could not be updated' }, { status: 500 });
  }

  return NextResponse.json({ question: data });
}
