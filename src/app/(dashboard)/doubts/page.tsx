import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { DoubtBoardClient } from '@/components/features/doubts/DoubtBoardClient';
export const metadata: Metadata = { title: 'Ask a Teacher' };

export default async function DoubtsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: doubts } = await supabase.from('doubts').select('*, profiles(full_name, avatar_url), doubt_replies(id, body, is_accepted, created_at, profiles(full_name, is_ai_operated))').order('created_at', { ascending: false }).limit(30);
  const { data: profile } = await supabase.from('profiles').select('board, grade_level').eq('id', user!.id).single();
  let subjectsQuery = supabase.from('subjects').select('id, name').eq('is_active', true).order('name');
  if (profile?.board) subjectsQuery = subjectsQuery.contains('boards', [profile.board]);
  if (profile?.grade_level) subjectsQuery = subjectsQuery.contains('grade_levels', [profile.grade_level]);
  const { data: subjects } = await subjectsQuery;
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Ask a Teacher 🎓</h1><p className="text-muted-foreground">Koi bhi sawaal pucho — teachers jawab denge</p></div>
      <DoubtBoardClient doubts={doubts || []} subjects={subjects || []} userId={user!.id} />
    </div>
  );
}
