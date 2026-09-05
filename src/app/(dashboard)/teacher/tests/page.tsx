import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TeacherTestStudio } from '@/components/features/teacher/TeacherTestStudio';

export const metadata: Metadata = { title: 'Teacher Test Studio' };

export default async function TeacherTestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, subscription_tier')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !['teacher', 'admin'].includes(String((profile as any).role))) redirect('/dashboard');

  const planTier = ['PRO', 'ELITE'].includes(String((profile as any).subscription_tier))
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="print:hidden">
        <p className="text-sm font-semibold text-amber-400">Teacher tools</p>
        <h1 className="text-2xl font-bold sm:text-3xl">Test Paper Studio</h1>
        <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
          Build a fresh paper from the uploaded chapter question bank, add your institution name, then print or save it
          as a branded PDF.
        </p>
      </div>
      <TeacherTestStudio subjects={subjects || []} chapters={chapters || []} planTier={planTier} />
    </div>
  );
}
