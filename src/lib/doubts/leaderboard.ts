import { createServiceClient } from '@/lib/supabase/service';

/**
 * Phase 3c — "Top Helpers" scoped to peer-help XP specifically. Reuses the existing
 * coin_transactions ledger (already written by awardCoins() on every accepted peer answer, reason
 * 'peer_doubt_answer') as the aggregation source, the same way /leaderboard aggregates
 * league_memberships — no new table, just a different existing ledger grouped by reason.
 *
 * coin_transactions RLS restricts SELECT to auth.uid() = user_id (a student can only read their own
 * coin history), so this cross-user aggregation runs on the service-role client — same pattern
 * /leaderboard already uses for its own cross-user student_chat_requests lookup.
 */
export async function getTopDoubtHelpers(limit = 10) {
  const db = createServiceClient() as any;
  const { data: transactions } = await db
    .from('coin_transactions')
    .select('user_id, amount')
    .eq('reason', 'peer_doubt_answer')
    .limit(2000);
  if (!transactions?.length) return [];

  const totals = new Map<string, { coins: number; answers: number }>();
  for (const row of transactions) {
    const current = totals.get(row.user_id) || { coins: 0, answers: 0 };
    current.coins += Number(row.amount || 0);
    current.answers += 1;
    totals.set(row.user_id, current);
  }

  const ranked = Array.from(totals.entries())
    .sort((a, b) => b[1].coins - a[1].coins)
    .slice(0, limit);
  const userIds = ranked.map(([userId]) => userId);
  const { data: profiles } = userIds.length
    ? await db.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
    : { data: [] };
  const profileById = new Map<string, { full_name?: string; avatar_url?: string }>(
    (profiles || []).map((p: any) => [p.id, p])
  );

  return ranked.map(([userId, totalsForUser]) => ({
    userId,
    fullName: profileById.get(userId)?.full_name || 'Student',
    avatarUrl: profileById.get(userId)?.avatar_url || null,
    answersAccepted: totalsForUser.answers,
    coinsEarned: totalsForUser.coins,
  }));
}
