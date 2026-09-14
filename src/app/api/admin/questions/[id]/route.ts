import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAdminUser } from '@/lib/admin/auth';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const adminClient = createServiceClient();
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
  // Demo eligibility has been removed — no editable fields remain.
  // Keep this endpoint intentionally read-only for updates.
  void req;
  void body;
  void id;
  return NextResponse.json({ error: 'No valid update fields' }, { status: 400 });
}
