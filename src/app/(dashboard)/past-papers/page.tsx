import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PastPapersGrid } from '@/components/features/past-papers/PastPapersGrid';
export const metadata: Metadata = { title: 'Past Papers' };

export default async function PastPapersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('board, grade_level').eq('id', user!.id).single();
  const papersQuery = supabase
    .from('past_papers')
    .select('*, subjects(id, name, slug, color), chapters(name)')
    .eq('board', profile?.board || 'FBISE')
    .order('year', { ascending: false }) as any;
  const { data: papers } = await papersQuery.eq('grade_level', profile?.grade_level || 'GRADE_9');
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Past Papers</h1><p className="text-muted-foreground">Sirf aapki selected class aur board ke verified past papers</p></div>
      <PastPapersGrid papers={(papers || []) as any} board={profile?.board || undefined} gradeLevel={profile?.grade_level || undefined} />
    </div>
  );
}
