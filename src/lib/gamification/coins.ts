import { createServiceClient } from '@/lib/supabase/service';

export async function awardCoins(userId: string, amount: number, reason: string, referenceId?: string | null) {
  const finalAmount = Math.floor(Number(amount) || 0);
  if (finalAmount === 0) return { amount: 0, balance: null };

  const supabase = createServiceClient() as any;
  const { error: txError } = await supabase.from('coin_transactions').insert({
    user_id: userId,
    amount: finalAmount,
    reason,
    reference_id: referenceId || null,
  });
  if (txError) throw txError;

  const { data, error } = await supabase.rpc('increment_coins', {
    p_user_id: userId,
    p_amount: finalAmount,
  });
  if (error) throw error;

  if (finalAmount > 0) {
    const { checkAndAwardAchievements } = await import('@/lib/gamification/checkAchievements');
    await checkAndAwardAchievements(userId, { source: reason });
  }

  return { amount: finalAmount, balance: data as number };
}
