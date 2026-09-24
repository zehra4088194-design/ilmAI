import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getSchoolContext } from '@/lib/school-erp/access';
import { getCollegeContext } from '@/lib/college-erp/access';

const BUCKET = 'institution-assignment-submissions';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  const kind = req.nextUrl.searchParams.get('kind');
  if (!id || !['school','college'].includes(kind || '')) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const service = createServiceClient() as any;
  const db = supabase as any;
  const table = kind === 'school' ? 'school_homework_submissions' : 'college_assignment_submissions';
  const { data: submission } = await service.from(table).select('id, organization_id, student_id, submission_url').eq('id', id).maybeSingle();
  if (!submission || !submission.submission_url) return NextResponse.json({ error: 'File not found.' }, { status: 404 });

  let allowed = submission.student_id === user.id;
  if (!allowed && kind === 'school') {
    const context = await getSchoolContext(supabase, user.id, submission.organization_id);
    allowed = Boolean(context && ['owner','admin','coordinator','teacher','staff'].includes(context.membership.member_role));
    if (!allowed) {
      const { data: guardian } = await db.from('school_guardians').select('id').eq('organization_id', submission.organization_id).eq('student_id', submission.student_id).eq('guardian_id', user.id).maybeSingle();
      allowed = Boolean(guardian);
    }
  }
  if (!allowed && kind === 'college') {
    const context = await getCollegeContext(supabase, user.id, submission.organization_id);
    allowed = Boolean(context && ['owner','admin','coordinator','teacher','staff'].includes(context.membership.member_role));
    if (!allowed) {
      const { data: guardian } = await db.from('college_guardians').select('id').eq('organization_id', submission.organization_id).eq('student_id', submission.student_id).eq('guardian_id', user.id).maybeSingle();
      allowed = Boolean(guardian);
    }
  }
  if (!allowed) return NextResponse.json({ error: 'File access denied.' }, { status: 403 });

  const { data: signed, error } = await service.storage.from(BUCKET).createSignedUrl(submission.submission_url, 120);
  if (error || !signed?.signedUrl) return NextResponse.json({ error: 'Could not open submission file.' }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
