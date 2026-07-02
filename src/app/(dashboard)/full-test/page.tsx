import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { FullTestSetup } from '@/components/features/quiz/FullTestEngine';
export const metadata: Metadata = { title: 'Full Test' };

export default async function FullTestPage() {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from('subjects').select('id, name, color').eq('is_active', true).order('name');
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('subscription_tier, board, grade_level').eq('id', user!.id).single();
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Full Test 📋</h1><p className="text-muted-foreground">Board pattern ya custom — MCQs + Short + Long questions ek saath</p></div>
      <FullTestSetup subjects={subjects || []} defaultBoard={profile?.board || 'FBISE'} defaultGrade={profile?.grade_level || 'GRADE_10'} userTier={(profile?.subscription_tier as any) || 'FREE'} />
    </div>
  );
}
