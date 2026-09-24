import { createServiceClient } from '@/lib/supabase/service';
import { awardCoins } from '@/lib/gamification/coins';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';

// Phase 7b — reward given to BOTH sides on the referee's first paid subscription. Coins (not a
// discount/coupon system, which doesn't exist in this app) via the existing awardCoins ledger —
// same reward primitive every other feature in this session uses.
export const REFERRAL_REWARD_COINS = 200;

/**
 * Called from the Paddle webhook's transaction.completed handler (see reconcileProfileAccess's
 * call site) right after a user's subscription is activated. No-ops instantly if there's no
 * pending referral for this user, or it was already rewarded — safe to call on every transaction,
 * not just the first.
 */
export async function processReferralConversion(refereeId: string) {
  try {
    const db = createServiceClient() as any;
    const { data: referral } = await db
      .from('referral_signups')
      .select('id, referrer_id, reward_granted')
      .eq('referee_id', refereeId)
      .eq('status', 'pending')
      .maybeSingle();
    if (!referral || referral.reward_granted) return;

    await db
      .from('referral_signups')
      .update({ status: 'converted', reward_granted: true, converted_at: new Date().toISOString() })
      .eq('id', referral.id);

    await awardCoins(referral.referrer_id, REFERRAL_REWARD_COINS, 'referral_conversion', referral.id);
    await awardCoins(refereeId, REFERRAL_REWARD_COINS, 'referral_conversion', referral.id);

    await Promise.all([
      createNotificationIfEnabled(db, 'achievements', {
        user_id: referral.referrer_id,
        type: 'ACHIEVEMENT',
        title: 'Referral reward!',
        message: `A friend you referred just subscribed. You earned ${REFERRAL_REWARD_COINS} coins.`,
        link: '/dashboard',
        is_read: false,
      }),
      createNotificationIfEnabled(db, 'achievements', {
        user_id: refereeId,
        type: 'ACHIEVEMENT',
        title: 'Referral bonus!',
        message: `Thanks for using a referral code — you earned ${REFERRAL_REWARD_COINS} coins.`,
        link: '/dashboard',
        is_read: false,
      }),
    ]);
  } catch (error) {
    // Never let a referral-reward hiccup fail the actual subscription activation.
    console.error('Referral conversion processing failed:', error);
  }
}
