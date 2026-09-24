import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PlannerSetupWizard } from './PlannerSetupWizard';

export const metadata: Metadata = { title: 'Planner Setup' };

export default async function PlannerSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, { data: twin }] = await Promise.all([
    supabase.from('profiles').select('board, grade_level').eq('id', user!.id).single(),
    supabase.from('student_digital_twin' as any).select('preferred_study_time').eq('student_id', user!.id).maybeSingle(),
  ]);

  let subjectsQuery = supabase.from('subjects').select('id, name').eq('is_active', true).order('name');
  if (profile?.board) subjectsQuery = subjectsQuery.contains('boards', [profile.board]);
  if (profile?.grade_level) subjectsQuery = subjectsQuery.contains('grade_levels', [profile.grade_level]);
  const { data: subjects } = await subjectsQuery;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-violet-400">Smart study planner</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Plan around your weak chapters</h1>
      </div>
      <PlannerSetupWizard subjects={subjects || []} preferredStudyTime={(twin as any)?.preferred_study_time || null} />
    </div>
  );
}
