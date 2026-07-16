import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import type { Database } from '@/lib/supabase/database.types';

type SubscriptionTier = Database['public']['Enums']['subscription_tier'];
type ManualSubscriptionDuration = 'monthly' | 'yearly' | 'lifetime';

function getManualExpiry(tier: SubscriptionTier, duration: ManualSubscriptionDuration) {
  if (tier === 'FREE' || duration === 'lifetime') return null;

  const date = new Date();
  if (duration === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString();
}

// POST /api/admin/grant-pro
// body: { userId: string, tier: 'FREE' | 'PRO' | 'ELITE', duration?: 'monthly' | 'yearly' | 'lifetime', sponsoredInstitutionName?: string, sponsoredInstitutionType?: 'school' | 'college' }
// Lets an admin manually move any user onto Pro/Elite (or back to Free), bypassing
// Paddle/PayPro entirely. Used by the admin Users panel.
export async function POST(req: NextRequest) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const {
    userId,
    tier,
    lifetime,
    duration: rawDuration,
    sponsoredInstitutionName,
    sponsoredInstitutionType,
  } = (await req.json()) as {
    userId: string;
    tier: SubscriptionTier;
    lifetime?: boolean;
    duration?: ManualSubscriptionDuration;
    sponsoredInstitutionName?: string;
    sponsoredInstitutionType?: 'school' | 'college';
  };

  if (!userId || !['FREE', 'PRO', 'ELITE'].includes(tier)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const duration: ManualSubscriptionDuration =
    tier === 'FREE' ? 'lifetime' : lifetime ? 'lifetime' : rawDuration || 'monthly';
  if (!['monthly', 'yearly', 'lifetime'].includes(duration)) {
    return NextResponse.json({ error: 'Invalid subscription duration' }, { status: 400 });
  }

  const institutionName = typeof sponsoredInstitutionName === 'string' ? sponsoredInstitutionName.trim() : '';
  if (tier !== 'FREE' && (!institutionName || !['school', 'college'].includes(sponsoredInstitutionType || ''))) {
    return NextResponse.json(
      { error: 'Paid plan ke liye school/college aur institution name select karein.' },
      { status: 400 }
    );
  }

  let adminClient;
  try {
    adminClient = await createAdminClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Supabase admin client missing' },
      { status: 500 }
    );
  }

  const expiresAt = getManualExpiry(tier, duration);

  const { data: profile, error } = await adminClient
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_expires_at: expiresAt,
      sponsored_institution_name: tier === 'FREE' ? null : institutionName,
      sponsored_institution_type: tier === 'FREE' ? null : sponsoredInstitutionType,
    })
    .eq('id', userId)
    .select(
      'id, full_name, email, username, sponsored_institution_name, sponsored_institution_type, subscription_tier, subscription_expires_at, xp, created_at'
    )
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
    const subscriptionPayload = {
      user_id: userId,
      tier: tier as SubscriptionTier,
      status: 'active',
      provider: 'manual_admin',
      provider_customer_id: null,
      provider_subscription_id: `manual_${tier.toLowerCase()}_${duration}_${userId}`,
      current_period_start: now,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      updated_at: now,
    };

    const { data: existingSubscription, error: existingError } = await adminClient
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error('manual subscription lookup error:', existingError);
      return NextResponse.json(
        { error: `Profile update ho gaya, subscription lookup fail: ${existingError.message}` },
        { status: 500 }
      );
    }

    const { error: subscriptionError } = existingSubscription
      ? await adminClient.from('subscriptions').update(subscriptionPayload).eq('id', existingSubscription.id)
      : await adminClient.from('subscriptions').insert({
          ...subscriptionPayload,
          user_id: userId,
        });

    if (subscriptionError) {
      console.error('manual subscription sync error:', subscriptionError);
      return NextResponse.json(
        { error: `Profile update ho gaya, subscription sync fail: ${subscriptionError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, user: profile, tier, duration, expiresAt });
}
