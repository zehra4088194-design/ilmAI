import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getQuranTeacherContext, getQuranStudentGroups } from '@/lib/quran/access';
import { QuranStudentView } from '@/components/features/quran/QuranStudentView';
import { QuranTeacherView } from '@/components/features/quran/QuranTeacherView';

export const metadata = { title: 'Quran Class | ilm AI' };

export default async function QuranPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fquran');

  const teacherContext = await getQuranTeacherContext(supabase, user.id);
  if (teacherContext) {
    return <QuranTeacherView groups={teacherContext.groups} />;
  }

  const groups = await getQuranStudentGroups(supabase, user.id);
  return <QuranStudentView groups={groups} />;
}
