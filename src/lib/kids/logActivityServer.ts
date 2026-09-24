import { createAdminClient } from '@/lib/supabase/server';
import { awardXp } from '@/lib/gamification/xp';

const MAX_XP_PER_ACTIVITY = 25;

/**
 * Server-side counterpart to logActivity.ts's client fetch wrapper: inserts one
 * kids_activity_log row and awards real XP via the shared gamification pipeline.
 * Used by both /api/kids/activity and /api/quran/practice so the two endpoints
 * share one insert+award code path instead of hand-duplicating it (and so the
 * same MAX_XP_PER_ACTIVITY clamp applies everywhere, not just the generic route).
 */
export async function logKidsActivityServer(userId: string, category: string, activityKey: string, xp: number) {
  const xpEarned = Math.max(0, Math.min(MAX_XP_PER_ACTIVITY, Math.floor(Number(xp) || 0)));
  const admin = await createAdminClient();

  await admin.from('kids_activity_log').insert({
    user_id: userId,
    category: String(category).slice(0, 40),
    activity_key: String(activityKey).slice(0, 80),
    xp_earned: xpEarned,
  });

  return awardXp(userId, xpEarned, `kids_${category}`, { checkAchievements: true });
}
