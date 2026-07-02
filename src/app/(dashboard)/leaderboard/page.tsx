import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { LeaderboardTable } from '@/components/features/progress/LeaderboardTable';
export const metadata: Metadata = { title: 'Leaderboard' };

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: topUsers } = await supabase.from('profiles').select('id, full_name, avatar_url, board, xp, level, streak').order('xp', { ascending: false }).limit(50);
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Leaderboard</h1><p className="text-muted-foreground">Pakistan ke top students se compete karo</p></div>
      <LeaderboardTable users={topUsers || []} currentUserId={user!.id} />
    </div>
  );
}
