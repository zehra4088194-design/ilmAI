import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolPortalData } from '@/lib/school-erp/queries';
import { InstitutionStudentHub } from '@/components/features/institution/InstitutionStudentHub';

export const metadata = { title: 'My Institution | ilm AI' };

export default async function SchoolStudentHubPage() {
  const { user, supabase, context } = await requireSchoolContext('dashboard.read');
  if (!user) redirect('/login?redirect=%2Fschool%2Fstudent-hub');
  if (!context || !['student', 'parent'].includes(context.membership.member_role)) redirect('/school');

  const data = await getSchoolPortalData(supabase, context);
  const db = supabase as any;
  const studentIds = data.students.map((student: any) => student.id);
  const targetIds = context.membership.member_role === 'student' ? [context.userId] : studentIds;

  const [{ data: profiles }, { data: enrollments }, { data: notifications }] = await Promise.all([
    db.from('profiles').select('id, full_name, avatar_url').in('id', targetIds.length ? targetIds : [context.userId]),
    targetIds.length
      ? db
          .from('school_enrollments')
          .select('student_id, roll_number, section_id, school_sections!school_enrollments_section_id_fkey(name, school_classes!school_sections_class_id_fkey(name))')
          .eq('organization_id', context.organization.id)
          .in('student_id', targetIds)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    db
      .from('notifications')
      .select('id, title, message, link, is_read, created_at')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const primaryProfile = (profiles || []).find((item: any) => item.id === context.userId) || profiles?.[0] || { full_name: null, avatar_url: null };
  const enrollment = (enrollments || []).find((item: any) => item.student_id === context.userId) || enrollments?.[0];
  const section = enrollment ? (Array.isArray(enrollment.school_sections) ? enrollment.school_sections[0] : enrollment.school_sections) : null;
  const klass = section ? (Array.isArray(section.school_classes) ? section.school_classes[0] : section.school_classes) : null;

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <InstitutionStudentHub
          kind="school"
          role={context.membership.member_role}
          organization={context.organization}
          profile={primaryProfile}
          enrollment={
            enrollment
              ? {
                  classLabel: klass?.name || '',
                  sectionLabel: section?.name || '',
                  rollNumber: enrollment.roll_number || null,
                  academicLabel: null,
                  campusLabel: context.campus?.name || null,
                }
              : null
          }
          students={(profiles || []).map((item: any) => ({ id: item.id, full_name: item.full_name }))}
          attendance={data.attendance}
          reportCards={data.reportCards}
          invoices={data.invoices}
          timetable={data.timetable}
          assignments={data.homework}
          announcements={data.announcements}
          events={data.events}
          notifications={notifications || []}
        />
      </div>
    </main>
  );
}
