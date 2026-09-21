import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login is required.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const institutionType = body.institutionType === 'college' ? 'college' : body.institutionType === 'school' ? 'school' : null;
  const institutionId = typeof body.institutionId === 'string' ? body.institutionId : null;
  const applicationType = typeof body.applicationType === 'string' && body.applicationType.trim() ? body.applicationType.trim().slice(0, 80) : 'general';
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 120) : `${applicationType} application`;
  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 160) : '';
  const templateBody = typeof body.body === 'string' ? body.body.trim().slice(0, 12000) : '';
  if (!institutionType || !subject || !templateBody) return NextResponse.json({ error: 'Template type, subject and text are required.' }, { status: 400 });
  const { data, error } = await ((supabase as any).from('student_application_templates') as any)
    .insert({ student_id: user.id, institution_type: institutionType, institution_id: institutionId, application_type: applicationType, title, subject, body: templateBody })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ template: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login is required.' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Template id is required.' }, { status: 400 });
  const { error } = await ((supabase as any).from('student_application_templates') as any).delete().eq('id', id).eq('student_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
