import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { RoutineBuilder } from '@/components/features/routine/RoutineBuilder';
export const metadata: Metadata = { title: 'Study Routine' };

export default async function RoutinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user!.id).single();
  const { data: existingRoutine } = await supabase.from('study_routines').select('*').eq('user_id', user!.id).single();
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Study Routine 📅</h1><p className="text-muted-foreground">Build a personalized weekly schedule with AI based on your availability.</p></div>
      <RoutineBuilder existingRoutine={existingRoutine} userId={user!.id} userTier={(profile?.subscription_tier as any) || 'FREE'} />
    </div>
  );
}
