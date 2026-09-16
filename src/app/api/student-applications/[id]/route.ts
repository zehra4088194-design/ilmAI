import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED = new Set(['seen', 'approved', 'rejected', 'needs_changes']);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login is required.' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = typeof body?.status === 'string' ? body.status : '';
  const responseNote = typeof body?.responseNote === 'string' ? body.responseNote.trim().slice(0, 4000) : null;
  if (!ALLOWED.has(status)) return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });

  const { data: application, error } = await (supabase.from('student_applications') as any)
    .update({ status, response_note: responseNote, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_id', user.id)
    .select('id,student_id,subject,institution_type,institution_id,status')
    .single();
  if (error || !application) return NextResponse.json({ error: error?.message || 'Application not found.' }, { status: 404 });

  await (supabase.from('notifications') as any).insert({
    user_id: application.student_id,
    type: 'SYSTEM',
    title: `Application ${status.replace('_', ' ')}`,
    message: `Your application "${application.subject}" has been marked ${status.replace('_', ' ')}.`,
    link: '/student-applications',
  });
  return NextResponse.json({ application });
}
