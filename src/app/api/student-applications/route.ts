import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStudentApplicationContext, getOwnStudentApplications, getOwnTemplates } from '@/lib/student-applications/server';

const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Login is required.' }, 401);
  const [institutions, applications, templates] = await Promise.all([
    getStudentApplicationContext(user.id),
    getOwnStudentApplications(user.id),
    getOwnTemplates(user.id),
  ]);
  return json({ institutions, applications, templates });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Login is required.' }, 401);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'Invalid request.' }, 400);

  const institutionType = body.institutionType === 'college' ? 'college' : body.institutionType === 'school' ? 'school' : null;
  const institutionId = typeof body.institutionId === 'string' ? body.institutionId : null;
  const enrollmentId = typeof body.enrollmentId === 'string' ? body.enrollmentId : null;
  const recipientType = body.recipientType === 'class_incharge' ? 'class_incharge' : body.recipientType === 'principal' ? 'principal' : null;
  const applicationType = typeof body.applicationType === 'string' && body.applicationType.trim() ? body.applicationType.trim().slice(0, 80) : 'general';
  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 160) : '';
  const applicationBody = typeof body.body === 'string' ? body.body.trim().slice(0, 12000) : '';
  const startsOn = typeof body.startsOn === 'string' && body.startsOn ? body.startsOn : null;
  const endsOn = typeof body.endsOn === 'string' && body.endsOn ? body.endsOn : null;

  if (!institutionType || !institutionId || !enrollmentId || !recipientType || !subject || !applicationBody) {
    return json({ error: 'Institution, recipient, subject and application text are required.' }, 400);
  }

  const institutions = await getStudentApplicationContext(user.id);
  const institution = institutions.find((item) => item.type === institutionType && item.id === institutionId && item.enrollmentId === enrollmentId);
  if (!institution) return json({ error: 'That institution connection is no longer active.' }, 403);
  const recipientId = recipientType === 'principal' ? institution.principalId : institution.classInchargeId;
  if (!recipientId) return json({ error: recipientType === 'principal' ? 'No principal is configured for this institution.' : 'No class incharge/advisor is assigned to your current class.' }, 400);

  const { data: created, error } = await ((supabase as any).from('student_applications') as any)
    .insert({
      student_id: user.id,
      institution_type: institutionType,
      institution_id: institutionId,
      enrollment_id: enrollmentId,
      recipient_type: recipientType,
      recipient_id: recipientId,
      application_type: applicationType,
      subject,
      body: applicationBody,
      starts_on: startsOn,
      ends_on: endsOn,
    })
    .select('*')
    .single();
  if (error) return json({ error: error.message }, 400);

  const guardianIds = institution.guardianIds.filter((id) => id !== user.id && id !== recipientId);
  const notifications = [
    { user_id: recipientId, type: 'SYSTEM', title: `New student application: ${subject}`, message: `A student has submitted an application to ${institution.name}.` + (startsOn ? ` Dates: ${startsOn}${endsOn ? ` to ${endsOn}` : ''}.` : ''), link: '/student-applications/inbox' },
    ...guardianIds.map((id) => ({ user_id: id, type: 'SYSTEM', title: `Student application copy: ${subject}`, message: `A student has submitted an application to ${institution.name}.` + (startsOn ? ` Dates: ${startsOn}${endsOn ? ` to ${endsOn}` : ''}.` : ''), link: '/parent' })),
  ];
  if (notifications.length) await (supabase.from('notifications') as any).insert(notifications);

  return json({ application: created }, 201);
}
