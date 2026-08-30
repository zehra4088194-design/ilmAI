import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CompleteProfileStep } from '@/components/features/auth/CompleteProfileStep';
import { needsProfileCompletion } from '@/lib/utils/checkProfileComplete';

export default async function CompleteProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fonboarding%2Fcomplete-profile');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, gender, board, grade_level, education_level, university_program, university_semester, username')
    .eq('id', user.id)
    .single();

  if (!needsProfileCompletion(profile ?? null)) {
    redirect('/dashboard');
  }

  // Only a Google/OAuth sign-in ever lands here with role defaulted rather than explicitly chosen
  // (Google carries no role/education-level metadata at all) — so only THAT case needs the
  // "who are you" reclassification chooser. Anyone who went through the full email/password
  // RegisterForm wizard already said "Student" on purpose; re-asking it here (on top of
  // re-asking gender/board/grade/username the wizard also already collected, whenever this page
  // is reached for a genuinely incomplete profile) was pure noise for that person.
  const providers = user.app_metadata?.providers;
  const isGoogleAuth =
    user.app_metadata?.provider === 'google' || (Array.isArray(providers) && providers.includes('google'));

  return (
    <CompleteProfileStep
      initialGender={profile?.gender === 'girl' || profile?.gender === 'boy' ? profile.gender : null}
      skipWhoAmI={!isGoogleAuth}
      initialUsername={profile?.username || ''}
      initialEducationLevel={
        profile?.education_level === 'college' || profile?.education_level === 'university'
          ? profile.education_level
          : 'school'
      }
      initialBoard={profile?.board || ''}
      initialGradeLevel={profile?.grade_level || ''}
    />
  );
}
