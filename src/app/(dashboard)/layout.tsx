import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { PersonalizationModal } from '@/components/features/onboarding/PersonalizationModal';
import { PublicResourceShell } from '@/components/layout/PublicResourceShell';
import { headers } from 'next/headers';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const pathname = (await headers()).get('x-invoke-path') || '';
    if (pathname.startsWith('/library') || pathname.startsWith('/past-papers')) {
      return <PublicResourceShell>{children}</PublicResourceShell>;
    }
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, board, grade_level, is_profile_complete, ai_onboarding_complete')
    .eq('id', user.id)
    .single();

  let personalizationSubjects: { id: string; name: string; isOptional: boolean }[] = [];
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
      .select('id, name, is_optional')
      .eq('is_active', true)
      .contains('boards', [profile.board])
      .contains('grade_levels', [profile.grade_level])
      .order('name');

    personalizationSubjects = (data ?? []).map((subject) => ({
      id: subject.id,
      name: subject.name,
      isOptional: subject.is_optional,
    }));
  }

  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      {shouldShowPersonalization && personalizationGradeLevel && (
        <PersonalizationModal
          gradeLevel={personalizationGradeLevel}
          subjects={personalizationSubjects}
        />
      )}
    </>
  );
}
