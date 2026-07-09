import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { GuessPaperClient } from '@/components/features/guess-paper/GuessPaperClient';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileQuestion } from 'lucide-react';
export const metadata: Metadata = { title: 'AI Guess Paper' };

export default async function GuessPaperPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('subscription_tier, board, grade_level').eq('id', user!.id).single();
  let subjectsQuery = supabase.from('subjects').select('id, name, slug, color').eq('is_active', true).order('name');
  if (profile?.board) subjectsQuery = subjectsQuery.contains('boards', [profile.board]);
  if (profile?.grade_level) subjectsQuery = subjectsQuery.contains('grade_levels', [profile.grade_level]);
  const { data: subjects } = await subjectsQuery;
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Guess Paper 🎯</h1>
        <p className="text-muted-foreground">AI predict karta hai kaunse questions board exam mein aa sakte hain</p>
      </div>
      {(subjects || []).length > 0 ? (
        <GuessPaperClient subjects={subjects || []} userTier={(profile?.subscription_tier as any) || 'FREE'} defaultBoard={profile?.board || undefined} defaultGrade={profile?.grade_level || undefined} />
      ) : (
        <EmptyState
          icon={FileQuestion}
          title="No subjects found for guess papers"
          description="Guess papers class aur board ke subjects se bante hain. Profile check karo, ya AI Tutor se topic-wise expected questions le lo."
          primaryHref="/settings"
          primaryLabel="Check Profile"
          secondaryHref="/ai-tutor"
          secondaryLabel="Ask AI Tutor"
        />
      )}
    </div>
  );
}
