import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { FullTestSetup } from '@/components/features/quiz/FullTestEngine';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClipboardList } from 'lucide-react';
export const metadata: Metadata = { title: 'Full Test' };

export default async function FullTestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('subscription_tier, board, grade_level').eq('id', user!.id).single();
  let subjectsQuery = supabase.from('subjects').select('id, name, color').eq('is_active', true).order('name');
  if (profile?.board) subjectsQuery = subjectsQuery.contains('boards', [profile.board]);
  if (profile?.grade_level) subjectsQuery = subjectsQuery.contains('grade_levels', [profile.grade_level]);
  const { data: subjects } = await subjectsQuery;
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Full Test 📋</h1><p className="text-muted-foreground">Choose a board pattern or custom test with MCQs, short questions, and long questions.</p></div>
      {(subjects || []).length > 0 ? (
        <FullTestSetup subjects={subjects || []} defaultBoard={profile?.board || 'FBISE'} defaultGrade={profile?.grade_level || 'GRADE_10'} userTier={(profile?.subscription_tier as any) || 'FREE'} />
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No subjects found for your class"
          description="Complete your board and class profile, or ask an admin to add subjects for your class. AI Tutor can still help by topic."
          primaryHref="/settings"
          primaryLabel="Check Profile"
          secondaryHref="/ai-tutor"
          secondaryLabel="Ask AI Tutor"
        />
      )}
    </div>
  );
}
