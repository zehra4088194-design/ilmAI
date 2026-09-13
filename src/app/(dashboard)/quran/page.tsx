import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getQuranTeacherContext, getQuranStudentGroups } from '@/lib/quran/access';
import { QuranStudentView } from '@/components/features/quran/QuranStudentView';
import { QuranTeacherView } from '@/components/features/quran/QuranTeacherView';

export const metadata = { title: 'Quran Class | ilm AI' };

export default async function QuranPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fquran');

  // Quran teaching is a separate capability. An ordinary teacher must not get a Quran
  // dashboard simply by visiting /quran directly; only an active quran_teachers row,
  // created/approved through the admin Quran-teacher flow, grants teacher access.
  const teacherContext = await getQuranTeacherContext(supabase, user.id);
  if (teacherContext) {
    return <QuranTeacherView groups={teacherContext.groups} />;
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (['teacher', 'admin'].includes(String(profile?.role || ''))) {
    redirect('/dashboard');
  }

  const groups = await getQuranStudentGroups(supabase, user.id);
  return <QuranStudentView groups={groups} />;
}
