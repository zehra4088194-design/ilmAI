import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PersonalizationModal } from '@/components/features/onboarding/PersonalizationModal';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, board, grade_level, is_profile_complete, ai_onboarding_complete')
    .eq('id', user.id)
    .single();

  let optionalSubjects: { id: string; name: string }[] = [];
  const shouldShowPersonalization =
    profile?.role === 'student' &&
    profile.ai_onboarding_complete === false &&
    profile.is_profile_complete === true &&
    profile.board !== null &&
    profile.grade_level !== null;
  const personalizationGradeLevel = shouldShowPersonalization ? profile.grade_level : null;

  if (shouldShowPersonalization) {
    const { data } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('is_active', true)
      .eq('is_optional', true)
      .contains('boards', [profile.board])
      .contains('grade_levels', [profile.grade_level])
      .order('name');

    optionalSubjects = data ?? [];
  }

  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      {shouldShowPersonalization && personalizationGradeLevel && (
        <PersonalizationModal
          gradeLevel={personalizationGradeLevel}
          optionalSubjects={optionalSubjects}
        />
      )}
    </>
  );
}
