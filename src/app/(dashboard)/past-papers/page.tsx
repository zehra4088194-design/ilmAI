import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PastPapersGrid } from '@/components/features/past-papers/PastPapersGrid';
export const metadata: Metadata = { title: 'Past Papers' };

export default async function PastPapersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('board, grade_level').eq('id', user!.id).single();
  let subjectsQuery = supabase.from('subjects').select('id, name, slug, color').eq('is_active', true).order('name');
  if (profile?.board) subjectsQuery = subjectsQuery.contains('boards', [profile.board]);
  if (profile?.grade_level) subjectsQuery = subjectsQuery.contains('grade_levels', [profile.grade_level]);
  const { data: subjects } = await subjectsQuery;
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Past Papers</h1><p className="text-muted-foreground">20 saal ke verified past papers, board-wise organized</p></div>
      <PastPapersGrid subjects={subjects || []} board={profile?.board || undefined} />
    </div>
  );
}
