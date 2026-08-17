import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveKidsDashboardEligibility } from '@/lib/kids/resolveEligibility';
import { KidsDashboardShell } from '@/components/features/kids/KidsDashboardShell';

export const metadata = { title: 'My Dashboard | ilm AI' };

// Deliberately outside the (dashboard) route group — that layout always wraps
// children in the regular DashboardShell (sidebar, top bar, adult-app chrome).
// The whole point of the Kids Dashboard is zero shared chrome with the main app.
export default async function KidsDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fkids');

  const { eligible, firstName } = await resolveKidsDashboardEligibility(supabase, user.id);
  if (!eligible) redirect('/dashboard');

  const { data: profile } = await (supabase as any).from('profiles').select('xp, streak').eq('id', user.id).maybeSingle();

  return <KidsDashboardShell studentName={firstName} xp={profile?.xp || 0} streak={profile?.streak || 0} />;
}
