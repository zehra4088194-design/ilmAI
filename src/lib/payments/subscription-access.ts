export type SubscriptionAccessCandidate = {
  tier?: string | null;
  status?: string | null;
  current_period_end?: string | null;
};

const ACCESS_STATUSES = new Set(['active', 'trialing', 'past_due']);
const TIER_RANK: Record<string, number> = { FREE: 0, PRO: 1, ELITE: 2 };

export function selectEffectiveSubscription(
  candidates: SubscriptionAccessCandidate[],
  now = new Date()
): { tier: 'FREE' | 'PRO' | 'ELITE'; expiresAt: string | null } {
  const active = candidates
    .filter((candidate) => {
      if (!candidate.status || !ACCESS_STATUSES.has(candidate.status)) return false;
      if (candidate.tier !== 'PRO' && candidate.tier !== 'ELITE') return false;
      if (!candidate.current_period_end) return false;
      const expiry = new Date(candidate.current_period_end).getTime();
      return Number.isFinite(expiry) && expiry > now.getTime();
    })
    .sort((left, right) => {
      const rightRank = TIER_RANK[right.tier || 'FREE'] ?? 0;
      const leftRank = TIER_RANK[left.tier || 'FREE'] ?? 0;
      const tierDifference = rightRank - leftRank;
      if (tierDifference !== 0) return tierDifference;
      return new Date(right.current_period_end || 0).getTime() - new Date(left.current_period_end || 0).getTime();
    });

  const selected = active[0];
  if (!selected || (selected.tier !== 'PRO' && selected.tier !== 'ELITE')) {
    return { tier: 'FREE', expiresAt: null };
  }

  return { tier: selected.tier, expiresAt: selected.current_period_end || null };
}
