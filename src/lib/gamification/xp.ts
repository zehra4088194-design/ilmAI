import { createServiceClient } from '@/lib/supabase/service';

export async function awardXp(
  userId: string,
  amount: number,
  reason = 'xp_award',
  options: { checkAchievements?: boolean } = {}
) {
  const xpToAdd = Math.max(0, Math.min(1000, Math.floor(Number(amount) || 0)));
  const supabase = createServiceClient() as any;

  if (xpToAdd <= 0) {
    const { data: profile } = await supabase.from('profiles').select('xp, level').eq('id', userId).single();
    return { awarded: 0, xp: profile?.xp || 0, level: profile?.level || 1, weeklyXp: 0 };
  }

  const { data, error } = await supabase.rpc('increment_xp_and_league', {
    p_user_id: userId,
    p_amount: xpToAdd,
  });
  if (error) throw error;

  if (options.checkAchievements !== false) {
    const { checkAndAwardAchievements } = await import('@/lib/gamification/checkAchievements');
    await checkAndAwardAchievements(userId, { source: reason });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    awarded: xpToAdd,
    xp: row?.xp || 0,
    level: row?.level || 1,
    weeklyXp: row?.weekly_xp || 0,
  };
}
