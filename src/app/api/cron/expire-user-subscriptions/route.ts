import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { selectEffectiveSubscription } from '@/lib/payments/subscription-access';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Personal and institution subscriptions both live in the same table. Access is always period-based:
// once current_period_end has passed, an active/trialing/past_due row must stop granting the profile
// a paid tier. The profile column is a cached compatibility field used by many older routes, so this
// sweep keeps that cache in sync instead of leaving an expired manual grant active forever.
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = (await createAdminClient()) as any;
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: expiredRows, error } = await admin
    .from('subscriptions')
    .select('id, user_id, tier, status, current_period_end')
    .in('status', ['active', 'trialing', 'past_due'])
    .lt('current_period_end', nowIso);

  if (error) {
    console.error('expired subscription sweep lookup failed:', error);
    return NextResponse.json({ error: `Subscription expiry sweep failed: ${error.message}` }, { status: 500 });
  }

  const expiredIds = (expiredRows || []).map((row: any) => row.id).filter(Boolean);
  const affectedUserIds = [...new Set((expiredRows || []).map((row: any) => row.user_id).filter(Boolean))] as string[];

  if (expiredIds.length) {
    const { error: cancelError } = await admin
      .from('subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: false,
        updated_at: nowIso,
      })
      .in('id', expiredIds);

    if (cancelError) {
      console.error('expired subscription cancel failed:', cancelError);
      return NextResponse.json({ error: `Expired subscriptions could not be canceled: ${cancelError.message}` }, { status: 500 });
    }
  }

  let profilesRevoked = 0;

  for (const userId of affectedUserIds) {
    const { data: candidates, error: candidateError } = await admin
      .from('subscriptions')
      .select('tier, status, current_period_end')
      .eq('user_id', userId);

    if (candidateError) {
      console.error('effective subscription lookup failed:', userId, candidateError);
      continue;
    }

    const effective = selectEffectiveSubscription(candidates || [], now);

    const { error: profileError } = await admin
      .from('profiles')
      .update({
        subscription_tier: effective.tier,
        subscription_expires_at: effective.expiresAt,
        updated_at: nowIso,
      })
      .eq('id', userId);

    if (profileError) {
      console.error('profile subscription cache sync failed:', userId, profileError);
      continue;
    }

    if (effective.tier === 'FREE') profilesRevoked += 1;
  }

  return NextResponse.json({
    status: 'success',
    expiredSubscriptions: expiredIds.length,
    affectedUsers: affectedUserIds.length,
    profilesRevoked,
    checkedAt: nowIso,
  });
}
