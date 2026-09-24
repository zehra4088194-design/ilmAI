// Recomputes rank + percentile for every completed entry in a competition, and issues (or
// refreshes) each finisher's certificate row. Called after any entry completes — cheap because a
// single competition's entry count is bounded (one class, one school, or one global daily pool).

import { createServiceClient } from '@/lib/supabase/service';

export async function recomputeCompetitionLeaderboard(competitionId: string) {
  const db = createServiceClient() as any;
  const { data: entries } = await db
    .from('competition_entries')
    .select('id, user_id, score, time_spent')
    .eq('competition_id', competitionId)
    .not('completed_at', 'is', null)
    .order('score', { ascending: false })
    .order('time_spent', { ascending: true });

  const rows = entries || [];
  const total = rows.length;
  if (!total) return;

  const updates = rows.map((row: any, index: number) => ({
    id: row.id,
    rank: index + 1,
    percentile: Math.round(((total - (index + 1)) / total) * 1000) / 10,
  }));

  await Promise.all(
    updates.map((update: any) => db.from('competition_entries').update({ rank: update.rank, percentile: update.percentile }).eq('id', update.id))
  );

  await db.from('competition_certificates').upsert(
    rows.map((row: any, index: number) => ({
      competition_id: competitionId,
      user_id: row.user_id,
      rank: index + 1,
      percentile: updates[index]!.percentile,
    })),
    { onConflict: 'competition_id,user_id' }
  );
}
