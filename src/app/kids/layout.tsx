import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { resolveKidsDashboardEligibility } from '@/lib/kids/resolveEligibility';
import { KidsShell } from '@/components/features/kids/KidsShell';

// Deliberately outside the (dashboard) route group — that layout always wraps children
// in the regular DashboardShell (sidebar, top bar, adult-app chrome). The whole point of
// the Kids Dashboard is zero shared chrome with the main app. The auth + eligibility gate
// used to live only in app/kids/page.tsx; it now lives here so every /kids/* sub-route
// (mission, english, quran, ...) is gated the same way without repeating the check.
export default async function KidsLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fkids');

  const { eligible, firstName } = await resolveKidsDashboardEligibility(supabase, user.id);
  if (!eligible) redirect('/dashboard');

  const { data: profile } = await supabase.from('profiles').select('xp, streak').eq('id', user.id).maybeSingle();

  return (
    <KidsShell studentName={firstName} xp={profile?.xp || 0} streak={profile?.streak || 0}>
      {children}
    </KidsShell>
  );
}
