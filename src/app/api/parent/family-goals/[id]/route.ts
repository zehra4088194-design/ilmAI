import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { id } = await params;
  const { progressValue, status } = await req.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (progressValue !== undefined) update.progress_value = Number(progressValue) || 0;
  if (status !== undefined) {
    if (!['active', 'done', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    update.status = status;
  }

  const admin = await createAdminClient();
  const { data, error } = await (admin.from('parent_family_goals' as any) as any)
    .update(update)
    .eq('id', id)
    .eq('parent_id', user.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'The goal could not be updated.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Goal not found.' }, { status: 404 });
  return NextResponse.json({ goal: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { id } = await params;
  const admin = await createAdminClient();
  const { error } = await (admin.from('parent_family_goals' as any) as any).delete().eq('id', id).eq('parent_id', user.id);
  if (error) return NextResponse.json({ error: 'The goal could not be deleted.' }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}
