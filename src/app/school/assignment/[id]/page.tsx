import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { InstitutionAssignmentSubmit } from '@/components/features/institution/InstitutionAssignmentSubmit';

export const metadata = { title: 'Assignment | ilm AI' };

export default async function SchoolAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase, context } = await requireSchoolContext('dashboard.read');
  if (!user) redirect('/login');
  if (!context || context.membership.member_role !== 'student') redirect('/school');
  const db = supabase as any;
  const [{ data: assignment }, { data: submission }] = await Promise.all([
    db.from('school_homework').select('id,title,instructions,due_at,section_id').eq('id', id).eq('organization_id', context.organization.id).maybeSingle(),
    db.from('school_homework_submissions').select('id,submission_url,submission_text,submitted_at,marks_awarded,feedback').eq('homework_id', id).eq('student_id', user.id).maybeSingle(),
  ]);
  if (!assignment) notFound();
  const { data: enrollment } = await db.from('school_enrollments').select('section_id').eq('organization_id', context.organization.id).eq('student_id', user.id).eq('status','active').maybeSingle();
  if (!enrollment || enrollment.section_id !== assignment.section_id) redirect('/school');
  return <main className="mx-auto max-w-3xl p-4 sm:p-6"><InstitutionAssignmentSubmit kind="school" assignmentId={id} title={assignment.title} instructions={assignment.instructions} dueAt={assignment.due_at} existing={submission || null} /></main>;
}
