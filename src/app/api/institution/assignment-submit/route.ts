import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getSchoolContext } from '@/lib/school-erp/access';
import { getCollegeContext } from '@/lib/college-erp/access';
import { createNotificationsIfEnabled } from '@/lib/notifications/preferences';

const BUCKET = 'institution-assignment-submissions';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

async function uploadSubmission(service: any, userId: string, file: File | null) {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new Error('File must be 10 MB or smaller.');
  if (!ALLOWED.has(file.type)) throw new Error('Only PDF, JPG, PNG, or WEBP files are allowed.');
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const path = `${userId}/${randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await service.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });

  const form = await req.formData();
  const kind = String(form.get('kind') || '');
  const assignmentId = String(form.get('assignmentId') || '');
  const text = String(form.get('text') || '').trim().slice(0, 20000);
  const file = form.get('file');
  const uploadFile = file instanceof File ? file : null;
  if (!assignmentId || !['school', 'college'].includes(kind)) return NextResponse.json({ error: 'Assignment is required.' }, { status: 400 });
  if (!text && !uploadFile) return NextResponse.json({ error: 'Add written text or upload a file.' }, { status: 400 });

  const db = supabase as any;
  const service = createServiceClient() as any;
  let organizationId: string | null = null;
  let teacherId: string | null = null;
  let assignmentTitle = 'Assignment';
  let notifyTeacherIds: string[] = [];

  if (kind === 'school') {
    const context = await getSchoolContext(supabase, user.id);
    if (!context || !['student'].includes(context.membership.member_role)) return NextResponse.json({ error: 'A school student account is required.' }, { status: 403 });
    organizationId = context.organization.id;
    const { data: assignment } = await db.from('school_homework').select('id, title, section_id, created_by').eq('id', assignmentId).eq('organization_id', organizationId).maybeSingle();
    if (!assignment) return NextResponse.json({ error: 'Homework not found.' }, { status: 404 });
    const { data: enrollment } = await db.from('school_enrollments').select('section_id').eq('organization_id', organizationId).eq('student_id', user.id).eq('status','active').maybeSingle();
    if (!enrollment || enrollment.section_id !== assignment.section_id) return NextResponse.json({ error: 'This homework is not assigned to your section.' }, { status: 403 });
    assignmentTitle = assignment.title;
    teacherId = assignment.created_by;
    if (teacherId) notifyTeacherIds = [teacherId];
  } else {
    const context = await getCollegeContext(supabase, user.id);
    if (!context || !['student'].includes(context.membership.member_role)) return NextResponse.json({ error: 'A college student account is required.' }, { status: 403 });
    organizationId = context.organization.id;
    const { data: assignment } = await db.from('college_assignments').select('id, title, section_id, created_by').eq('id', assignmentId).eq('organization_id', organizationId).maybeSingle();
    if (!assignment) return NextResponse.json({ error: 'Assignment not found.' }, { status: 404 });
    const { data: enrollment } = await db.from('college_enrollments').select('section_id').eq('organization_id', organizationId).eq('student_id', user.id).eq('status','active').maybeSingle();
    if (!enrollment || enrollment.section_id !== assignment.section_id) return NextResponse.json({ error: 'This assignment is not assigned to your section.' }, { status: 403 });
    assignmentTitle = assignment.title;
    teacherId = assignment.created_by;
    if (teacherId) notifyTeacherIds = [teacherId];
  }

  const path = await uploadSubmission(service, user.id, uploadFile);
  const table = kind === 'school' ? 'school_homework_submissions' : 'college_assignment_submissions';
  const fk = kind === 'school' ? 'homework_id' : 'assignment_id';
  const { data: saved, error } = await service.from(table).upsert({
    organization_id: organizationId,
    [fk]: assignmentId,
    student_id: user.id,
    submission_url: path,
    submission_text: text || null,
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: `${fk},student_id` }).select('id, submitted_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (notifyTeacherIds.length) {
    await createNotificationsIfEnabled(service, 'studyReminders', notifyTeacherIds.map((teacherId) => ({
      user_id: teacherId,
      type: 'SYSTEM',
      title: 'Assignment submitted',
      message: `${assignmentTitle} has a new submission.`,
      link: kind === 'school' ? `/school-admin/homework/${assignmentId}` : `/college-admin/assignments/${assignmentId}`,
    })));
  }

  return NextResponse.json({ submitted: true, submission: saved });
}
