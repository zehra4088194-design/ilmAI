import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { ProgressChart } from '@/components/features/progress/ProgressChart';
import { SubjectHeatmap } from '@/components/features/progress/SubjectHeatmap';
import { AchievementsList } from '@/components/features/progress/AchievementsList';
export const metadata: Metadata = { title: 'Progress' };

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sessions } = await supabase.from('study_sessions').select('*').eq('user_id', user!.id).order('date', { ascending: false }).limit(30);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Your Progress</h1><p className="text-muted-foreground">Apna performance track karo aur improve karo</p></div>
      <ProgressChart sessions={sessions || []} />
      <div className="grid lg:grid-cols-2 gap-6">
        <SubjectHeatmap userId={user!.id} />
        <AchievementsList userId={user!.id} />
      </div>
    </div>
  );
}
