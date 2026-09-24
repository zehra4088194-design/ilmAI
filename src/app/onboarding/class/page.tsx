import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserGradeLevel } from '@/lib/supabase/getUserGradeLevel';
import { ClassSelectStep } from '@/components/features/onboarding/ClassSelectStep';

export default async function OnboardingClassPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=%2Fonboarding%2Fclass');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role && profile.role !== 'student') {
    redirect('/dashboard');
  }

  const { onboardingCompleted } = await getUserGradeLevel(supabase, user.id);

  if (onboardingCompleted) {
    redirect('/dashboard');
  }

  return <ClassSelectStep />;
}
