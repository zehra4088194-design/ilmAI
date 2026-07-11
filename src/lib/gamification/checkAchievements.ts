import { createServiceClient } from '@/lib/supabase/service';
import { awardXp } from '@/lib/gamification/xp';

type AchievementRow = {
  id: string;
  condition_type: string;
  condition_value: number;
  xp_reward: number;
};

function currentWeekStart() {
  const now = new Date();
  const day = now.getDay() || 7;
  now.setDate(now.getDate() - day + 1);
  return now.toISOString().slice(0, 10);
}

export async function checkAndAwardAchievements(userId: string, _context: { source?: string } = {}) {
  const supabase = createServiceClient() as any;
  const [{ data: profile }, { data: achievements }, { data: earned }, { data: league }, { data: coinRows }, { count: bossWins }] =
    await Promise.all([
      supabase.from('profiles').select('xp, streak, coins').eq('id', userId).single(),
      supabase.from('achievements').select('id, condition_type, condition_value, xp_reward'),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', userId),
      supabase
        .from('league_memberships')
        .select('weekly_xp')
        .eq('user_id', userId)
        .eq('week_start_date', currentWeekStart())
        .maybeSingle(),
      supabase.from('coin_transactions').select('amount').eq('user_id', userId).gt('amount', 0),
      supabase
        .from('boss_quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('score', 80),
    ]);

  const earnedIds = new Set((earned || []).map((row: { achievement_id: string }) => row.achievement_id));
  const stats: Record<string, number> = {
    streak_days: profile?.streak || 0,
    xp_total: profile?.xp || 0,
    xp: profile?.xp || 0,
    weekly_xp: league?.weekly_xp || 0,
    coins_earned: (coinRows || []).reduce((sum: number, row: { amount: number }) => sum + Math.max(0, row.amount || 0), 0),
    boss_quiz_wins: bossWins || 0,
  };

  const newlyEarned = (achievements || [])
    .filter((achievement: AchievementRow) => !earnedIds.has(achievement.id))
    .filter((achievement: AchievementRow) => (stats[achievement.condition_type] || 0) >= achievement.condition_value);

  if (!newlyEarned.length) return [];

  const { error } = await supabase.from('user_achievements').insert(
    newlyEarned.map((achievement: AchievementRow) => ({
      user_id: userId,
      achievement_id: achievement.id,
    }))
  );
  if (error) throw error;

  for (const achievement of newlyEarned) {
    if (achievement.xp_reward > 0) {
      await awardXp(userId, achievement.xp_reward, 'achievement_reward', { checkAchievements: false });
    }
  }

  return newlyEarned;
}
