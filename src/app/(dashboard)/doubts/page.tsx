import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { DoubtBoardClient } from '@/components/features/doubts/DoubtBoardClient';
export const metadata: Metadata = { title: 'Ask a Teacher' };

export default async function DoubtsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: doubts } = await supabase.from('doubts').select('*, profiles(full_name, avatar_url), doubt_replies(id, body, is_accepted, created_at, profiles(full_name, is_ai_operated))').order('created_at', { ascending: false }).limit(30);
  const { data: subjects } = await supabase.from('subjects').select('id, name').eq('is_active', true).order('name');
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Ask a Teacher 🎓</h1><p className="text-muted-foreground">Koi bhi sawaal pucho — teachers jawab denge</p></div>
      <DoubtBoardClient doubts={doubts || []} subjects={subjects || []} userId={user!.id} />
    </div>
  );
}
