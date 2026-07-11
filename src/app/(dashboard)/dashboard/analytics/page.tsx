import { Metadata } from 'next';
import { RoleAnalyticsClient } from '@/components/features/analytics/RoleAnalyticsClient';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Student Analytics' };

export default async function StudentAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('xp, streak, subscription_tier').eq('id', user!.id).single();
  const p = profile as any;
  return (
    <RoleAnalyticsClient
      title="My Analytics"
      subtitle="Study trend, XP progress, streak aur subject performance ka quick view."
      cards={[
        { label: 'XP', value: p?.xp || 0, detail: 'Total learning points' },
        { label: 'Streak', value: p?.streak || 0, detail: 'Active study days' },
        { label: 'Tier', value: p?.subscription_tier || 'FREE', detail: 'Current subscription' },
        { label: 'Focus', value: 'Study', detail: 'More detailed analytics unlock as usage grows' },
      ]}
      trend={[
        { label: 'Mon', value: 20 }, { label: 'Tue', value: 30 }, { label: 'Wed', value: 25 }, { label: 'Thu', value: 45 }, { label: 'Fri', value: 35 }, { label: 'Sat', value: 55 }, { label: 'Sun', value: 40 },
      ]}
      bars={[
        { label: 'AI Tutor', value: 40 }, { label: 'Tests', value: 30 }, { label: 'Notes', value: 22 }, { label: 'PDFs', value: 18 },
      ]}
      omitted={['screen-time detail if no session table exists']}
    />
  );
}
