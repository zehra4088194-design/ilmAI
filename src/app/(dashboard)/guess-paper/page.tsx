import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { GuessPaperClient } from '@/components/features/guess-paper/GuessPaperClient';
export const metadata: Metadata = { title: 'AI Guess Paper' };

export default async function GuessPaperPage() {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from('subjects').select('id, name, slug, color').eq('is_active', true).order('name');
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('subscription_tier, board, grade_level').eq('id', user!.id).single();
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Guess Paper 🎯</h1>
        <p className="text-muted-foreground">AI predict karta hai kaunse questions board exam mein aa sakte hain</p>
      </div>
      <GuessPaperClient subjects={subjects || []} userTier={(profile?.subscription_tier as any) || 'FREE'} defaultBoard={profile?.board || undefined} />
    </div>
  );
}
