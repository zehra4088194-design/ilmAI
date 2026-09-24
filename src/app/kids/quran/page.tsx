import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getQuranStudentGroups } from '@/lib/quran/access';
import { getQuranAttendanceSummary } from '@/lib/quran/attendance-summary';
import { KidsQuranView } from '@/components/features/kids/KidsQuranView';

export const metadata = { title: 'Quran Class | ilm AI Kids' };

export default async function KidsQuranPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fkids%2Fquran');

  const groups = await getQuranStudentGroups(supabase, user.id);
  const admin = await createAdminClient();
  const attendance = await getQuranAttendanceSummary(admin, user.id, groups.map((g) => g.id));

  const today = new Date().toISOString().slice(0, 10);
  const { data: practiceRow } = await admin
    .from('quran_daily_practice')
    .select('completed')
    .eq('student_id', user.id)
    .eq('practice_date', today)
    .maybeSingle();

  return (
    <KidsQuranView groups={groups} attendance={attendance} practiceDoneToday={!!practiceRow?.completed} />
  );
}
