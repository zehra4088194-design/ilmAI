import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WelcomeSection } from '@/components/features/dashboard/WelcomeSection';
import { StatsGrid } from '@/components/features/dashboard/StatsGrid';
import { ContinueLearning } from '@/components/features/dashboard/ContinueLearning';
import { RecentActivity } from '@/components/features/dashboard/RecentActivity';
import { QuickActions } from '@/components/features/dashboard/QuickActions';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  // Parents get redirected to their own dashboard automatically
  if (profile?.role === 'parent') redirect('/parent');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <WelcomeSection name={profile?.full_name || 'Student'} streak={profile?.streak || 0} />
      <StatsGrid
        xp={profile?.xp || 0}
        level={profile?.level || 1}
        streak={profile?.streak || 0}
        studyTime={profile?.total_study_time || 0}
      />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ContinueLearning />
          <RecentActivity userId={user!.id} />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
