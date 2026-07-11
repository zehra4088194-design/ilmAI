import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import type { Database } from '@/lib/supabase/database.types';

type SubscriptionTier = Database['public']['Enums']['subscription_tier'];

// POST /api/admin/grant-pro
// body: { userId: string, tier: 'FREE' | 'PRO' | 'ELITE', lifetime?: boolean }
// Lets an admin manually move any user onto Pro/Elite (or back to Free) for free,
// bypassing Paddle/PayPro entirely. Used by the admin Users panel.
export async function POST(req: NextRequest) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId, tier, lifetime } = (await req.json()) as {
    userId: string;
    tier: 'FREE' | 'PRO' | 'ELITE';
    lifetime?: boolean;
  };

  if (!userId || !['FREE', 'PRO', 'ELITE'].includes(tier)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  let adminClient;
  try {
    adminClient = await createAdminClient();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Supabase admin client missing' }, { status: 500 });
  }

  const expiresAt =
    tier === 'FREE'
      ? null
      : lifetime
        ? null // null expiry = never expires (lifetime pro/elite)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: profile, error } = await adminClient
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_expires_at: expiresAt,
    })
    .eq('id', userId)
    .select('id, full_name, email, subscription_tier, subscription_expires_at, xp, created_at')
    .maybeSingle();

  if (error) {
    console.error('grant-pro error:', error);
    return NextResponse.json({ error: `Update fail ho gaya: ${error.message}` }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: 'User profile nahi mila, plan update nahi hua' }, { status: 404 });
  }

  const now = new Date().toISOString();
  if (tier === 'FREE') {
    const { error: subscriptionError } = await adminClient
      .from('subscriptions')
      .update({
        tier: 'FREE' as SubscriptionTier,
        status: 'canceled',
        cancel_at_period_end: false,
        updated_at: now,
      })
      .eq('user_id', userId);

    if (subscriptionError) {
      console.error('manual subscription free sync error:', subscriptionError);
    }
  } else {
    const periodEnd = expiresAt ?? new Date('2099-12-31T23:59:59.000Z').toISOString();
    const { error: subscriptionError } = await adminClient.from('subscriptions').upsert(
      {
        user_id: userId,
        tier: tier as SubscriptionTier,
        status: 'active',
        provider: 'manual_admin',
        provider_customer_id: null,
        provider_subscription_id: `manual_${tier.toLowerCase()}_${userId}`,
        current_period_start: now,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    );

    if (subscriptionError) {
      console.error('manual subscription sync error:', subscriptionError);
      return NextResponse.json({ error: `Profile update ho gaya, subscription sync fail: ${subscriptionError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, user: profile, tier, expiresAt });
}
