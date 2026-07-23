import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PastPapersGrid } from '@/components/features/past-papers/PastPapersGrid';
import { AdSenseBanner } from '@/components/features/ads/AdSenseBanner';
export const metadata: Metadata = { title: 'Past Papers' };

export default async function PastPapersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('board, grade_level').eq('id', user.id).single()
    : { data: null };
  let papersQuery = supabase
    .from('past_papers')
    .select('id, subject_id, chapter_id, board, grade_level, year, paper_type, total_questions, duration, is_verified, download_count, created_at, subjects(id, name, slug, color), chapters(id, name, slug)')
    .order('year', { ascending: false }) as any;
  if (profile?.board) papersQuery = papersQuery.eq('board', profile.board);
  if (profile?.grade_level) papersQuery = papersQuery.eq('grade_level', profile.grade_level);
  const { data: papers } = await papersQuery;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><h1 className="text-2xl font-bold sm:text-3xl">Past Papers</h1><p className="text-muted-foreground mt-1">Select a subject, chapter, and then the exact paper.</p></div>
      <AdSenseBanner slot="inline" className="mx-auto max-w-5xl" />
      <PastPapersGrid papers={(papers || []) as any} board={profile?.board || undefined} gradeLevel={profile?.grade_level || undefined} />
    </div>
  );
}
