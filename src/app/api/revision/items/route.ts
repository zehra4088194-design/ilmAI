import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const { data, error } = await (supabase as any)
    .from('student_revision_items')
    .select('id, title, prompt, due_at, interval_days, status, subject_id, chapter_id, concept_id, subjects(name), chapters(name)')
    .eq('student_id', user.id)
    .eq('status', 'due')
    .lte('due_at', new Date().toISOString())
    .order('due_at', { ascending: true })
    .limit(30);

  if (error) return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success', data: { items: data || [] } });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== 'string') {
    return NextResponse.json({ status: 'error', error: 'Revision item id is required.' }, { status: 400 });
  }

  const status = body.status === 'skipped' ? 'skipped' : 'done';
  const { error } = await (supabase as any)
    .from('student_revision_items')
    .update({ status, completed_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('student_id', user.id);

  if (error) return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}
