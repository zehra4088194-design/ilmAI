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
    .select('role, board, grade_level, education_level, university_program, university_semester')
    .eq('id', user.id)
    .single();

  if (!needsProfileCompletion(profile ?? null)) {
    redirect('/dashboard');
  }

  return <CompleteProfileStep />;
}
