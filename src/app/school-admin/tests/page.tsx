import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { TeacherTestStudio } from '@/components/features/teacher/TeacherTestStudio';
import { requireSchoolContext } from '@/lib/school-erp/access';

export const metadata: Metadata = { title: 'Test Studio' };

export default async function SchoolAdminTestsPage() {
  const { supabase, user, context } = await requireSchoolContext('exams.manage', 'tests');
  if (!user) redirect('/login?redirect=%2Fschool-admin%2Ftests');
  if (!context) redirect('/school-admin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle();
  const planTier = ['PRO', 'ELITE'].includes(String((profile as any)?.subscription_tier))
    ? ((profile as any).subscription_tier as 'PRO' | 'ELITE')
    : 'FREE';

  const [{ data: subjects }, { data: chapters }] = await Promise.all([
    supabase.from('subjects').select('id, name, grade_levels').eq('is_active', true).order('name'),
    supabase
      .from('chapters')
      .select('id, subject_id, name, order_index, grade_levels')
      .eq('is_active', true)
      .order('order_index'),
  ]);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Test Studio"
        description="Build an AI-generated test paper from the chapter question bank, branded with your school's name, then print or save it as a PDF."
      />
      <TeacherTestStudio subjects={subjects || []} chapters={(chapters as any) || []} planTier={planTier} />
    </div>
  );
}
