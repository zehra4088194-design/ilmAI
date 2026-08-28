import { NextRequest, NextResponse } from 'next/server';
import { getPaymentProviderById } from '@/lib/payments';
import { createAdminClient } from '@/lib/supabase/server';
import { selectEffectiveSubscription } from '@/lib/payments/subscription-access';
import { syncOrganizationSchoolGrants } from '@/lib/school-erp/subscription-cascade';
import { syncOrganizationCollegeGrants } from '@/lib/college-erp/subscription-cascade';

type PaddleBillingCycle = 'monthly' | 'annual';
type PaddleTier = 'FREE' | 'PRO' | 'ELITE';

type PaddleWebhookEnvelope<T> = {
  event_type?: string;
  data?: T;
};

type PaddleTransactionData = {
  id: string;
  status?: string;
  customer_id?: string | null;
  subscription_id?: string | null;
  created_at?: string;
  billed_at?: string | null;
  custom_data?: Record<string, unknown> | null;
  items?: Array<{
    price?: {
      id?: string | null;
      billing_cycle?: {
        interval?: string | null;
      } | null;
    } | null;
  }>;
};

type PaddleSubscriptionData = {
  id: string;
  status?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused';
  customer_id?: string | null;
  current_billing_period?: {
    starts_at: string;
    ends_at: string;
  } | null;
  scheduled_change?: {
    action?: 'cancel' | 'pause' | 'resume' | null;
  } | null;
  custom_data?: Record<string, unknown> | null;
  items?: Array<{
    price?: {
      id?: string | null;
      billing_cycle?: {
        interval?: string | null;
      } | null;
    } | null;
  }>;
};

// Includes the parent/teacher/university price ids (see paddle.ts's FAMILY_PRICE_IDS) alongside
// the original student ones — every plan family still just resolves to PRO/ELITE on
// profiles.subscription_tier (see RolePlanCards' comment for why one column serves every account
// type), so the webhook only needs to recognize the price id, not which family it belongs to.
const PRICE_IDS = {
  PRO: new Set(
    [
      process.env.PADDLE_PRICE_ID_PRO_MONTHLY,
      process.env.PADDLE_PRICE_ID_PRO_ANNUAL,
      process.env.PADDLE_PRICE_ID_PARENT_PRO,
      process.env.PADDLE_PRICE_ID_TEACHER_PRO,
      process.env.PADDLE_PRICE_ID_UNIVERSITY_PRO,
    ].filter(Boolean)
  ),
  ELITE: new Set(
    [
      process.env.PADDLE_PRICE_ID_ELITE_MONTHLY,
      process.env.PADDLE_PRICE_ID_ELITE_ANNUAL,
      process.env.PADDLE_PRICE_ID_PARENT_ELITE,
      process.env.PADDLE_PRICE_ID_TEACHER_ELITE,
      process.env.PADDLE_PRICE_ID_UNIVERSITY_ELITE,
    ].filter(Boolean)
  ),
};

function resolveTier(priceId?: string | null, fallback?: string | null): PaddleTier {
  if (priceId && PRICE_IDS.ELITE.has(priceId)) return 'ELITE';
  if (priceId && PRICE_IDS.PRO.has(priceId)) return 'PRO';
  // Unrecognized price id (e.g. this webhook's env vars haven't caught up with a newly-added
  // family price yet) still falls back to custom_data.tier — set unconditionally in
  // paddleProvider.createCheckout — rather than silently downgrading the purchase to FREE.
  if (fallback === 'PRO' || fallback === 'ELITE') return fallback;
  return 'FREE';
}

function resolveBillingCycle(interval?: string | null, fallback?: string | null): PaddleBillingCycle {
  if (fallback === 'annual' || fallback === 'monthly') return fallback;
  return interval === 'year' ? 'annual' : 'monthly';
}

function addBillingPeriod(startAt: string, billingCycle: PaddleBillingCycle) {
  const date = new Date(startAt);
  if (billingCycle === 'annual') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString();
}

async function upsertSubscriptionRecord({
  supabase,
  userId,
  tier,
  status,
  providerCustomerId,
  providerSubscriptionId,
  currentPeriodStart,
  currentPeriodEnd,
  cancelAtPeriodEnd,
}: {
  supabase: Awaited<ReturnType<typeof createAdminClient>>;
  userId: string;
  tier: PaddleTier;
  status: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}) {
  const { error } = await (supabase.from('subscriptions') as any).upsert(
    {
      user_id: userId,
      provider: 'paddle',
      provider_customer_id: providerCustomerId,
      provider_subscription_id: providerSubscriptionId,
      tier,
      status,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
    } as any,
    { onConflict: 'provider_subscription_id' }
  );
  if (error) {
    throw new Error(`Paddle subscription sync failed: ${error.message}`);
  }
}

async function syncProfileTier({
  supabase,
  userId,
  tier,
  subscriptionExpiresAt,
}: {
  supabase: Awaited<ReturnType<typeof createAdminClient>>;
  userId: string;
  tier: PaddleTier;
  subscriptionExpiresAt: string | null;
}) {
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_expires_at: subscriptionExpiresAt,
    })
    .eq('id', userId);
  if (error) {
    throw new Error(`Paddle profile sync failed: ${error.message}`);
  }
}

// Institution transactions (see createInstitutionCheckout / create-institution-session route)
// carry organization_id + institution_type instead of a user tier — there's no profiles row to
// update; activating the plan means flipping this organization's plan-settings row to
// billing_status: 'active' with a fresh renews_on date, then cascading that access to every
// active member the same way the admin's own updateSchoolPlanSettings action does.
async function activateInstitutionBilling({
  supabase,
  organizationId,
  institutionType,
  billingCycle,
  periodEnd,
}: {
  supabase: Awaited<ReturnType<typeof createAdminClient>>;
  organizationId: string;
  institutionType: 'school' | 'college';
  billingCycle: PaddleBillingCycle;
  periodEnd: string;
}) {
  const table = institutionType === 'school' ? 'school_organization_plan_settings' : 'college_organization_plan_settings';
  const { error } = await (supabase.from(table) as any).upsert(
    {
      organization_id: organizationId,
      billing_status: 'active',
      renews_on: periodEnd.slice(0, 10),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' }
  );
  if (error) {
    throw new Error(`Paddle institution billing sync failed: ${error.message}`);
  }

  if (institutionType === 'school') {
    await syncOrganizationSchoolGrants(organizationId, true);
  } else {
    await syncOrganizationCollegeGrants(organizationId, true);
  }
}

async function reconcileProfileAccess(supabase: Awaited<ReturnType<typeof createAdminClient>>, userId: string) {
  const { data, error } = await (supabase.from('subscriptions') as any)
    .select('tier, status, current_period_end')
    .eq('user_id', userId);
  if (error) {
    throw new Error(`Paddle access reconciliation failed: ${error.message}`);
  }

  const access = selectEffectiveSubscription(data || []);
  await syncProfileTier({
    supabase,
    userId,
    tier: access.tier,
    subscriptionExpiresAt: access.expiresAt,
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('paddle-signature');

  const provider = getPaymentProviderById('paddle');
  const result = await provider.verifyWebhook(rawBody, signature);

  if (!result.valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createAdminClient();

  switch (result.eventType) {
    case 'transaction.completed': {
      const payload = result.payload as PaddleWebhookEnvelope<PaddleTransactionData>;
      const transaction = payload.data;
      const customData = transaction?.custom_data || {};

      // Institution (school/college) payments carry organization_id/institution_type instead of a
      // user tier — see createInstitutionCheckout. Handled entirely separately from the
      // profile-tier flow below since there's no profiles row involved.
      const organizationId = typeof customData.organization_id === 'string' ? customData.organization_id : null;
      const institutionType =
        customData.institution_type === 'school' || customData.institution_type === 'college'
          ? customData.institution_type
          : null;
      if (organizationId && institutionType) {
        const billingCycle = resolveBillingCycle(
          transaction?.items?.[0]?.price?.billing_cycle?.interval,
          typeof customData.billing_cycle === 'string' ? customData.billing_cycle : null
        );
        const periodStart = transaction?.billed_at || transaction?.created_at || new Date().toISOString();
        const periodEnd = addBillingPeriod(periodStart, billingCycle);
        await activateInstitutionBilling({ supabase, organizationId, institutionType, billingCycle, periodEnd });
        break;
      }

      const userId = typeof customData.user_id === 'string' ? customData.user_id : null;
      const priceId = transaction?.items?.[0]?.price?.id;
      const tier = resolveTier(priceId, typeof customData.tier === 'string' ? customData.tier : null);
      const billingCycle = resolveBillingCycle(
        transaction?.items?.[0]?.price?.billing_cycle?.interval,
        typeof customData.billing_cycle === 'string' ? customData.billing_cycle : null
      );

      if (!userId || tier === 'FREE' || !transaction?.subscription_id) {
        break;
      }

      const currentPeriodStart = transaction.billed_at || transaction.created_at || new Date().toISOString();
      const currentPeriodEnd = addBillingPeriod(currentPeriodStart, billingCycle);

      await upsertSubscriptionRecord({
        supabase,
        userId,
        tier,
        status: 'active',
        providerCustomerId: transaction.customer_id || null,
        providerSubscriptionId: transaction.subscription_id,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      });
      await reconcileProfileAccess(supabase, userId);
      break;
    }

    case 'subscription.updated':
    case 'subscription.created':
    case 'subscription.activated':
    case 'subscription.trialing':
    case 'subscription.past_due':
    case 'subscription.paused': {
      const payload = result.payload as PaddleWebhookEnvelope<PaddleSubscriptionData>;
      const subscription = payload.data;
      if (!subscription?.id) {
        break;
      }

      const { data: existing, error: lookupError } = await (supabase.from('subscriptions') as any)
        .select('user_id, tier')
        .eq('provider_subscription_id', subscription.id)
        .maybeSingle();
      if (lookupError) {
        throw new Error(`Paddle subscription lookup failed: ${lookupError.message}`);
      }

      const customData = subscription.custom_data || {};
      const customUserId = typeof customData.user_id === 'string' ? customData.user_id : null;
      const userId = existing?.user_id || customUserId;
      if (!userId) {
        break;
      }

      const priceId = subscription.items?.[0]?.price?.id;
      const fallbackTier =
        typeof existing?.tier === 'string'
          ? existing.tier
          : typeof customData.tier === 'string'
            ? customData.tier
            : null;
      const tier = resolveTier(priceId, fallbackTier);
      if (tier === 'FREE') {
        break;
      }
      const currentPeriodStart = subscription.current_billing_period?.starts_at || new Date().toISOString();
      const billingCycle = resolveBillingCycle(subscription.items?.[0]?.price?.billing_cycle?.interval, null);
      const currentPeriodEnd =
        subscription.current_billing_period?.ends_at || addBillingPeriod(currentPeriodStart, billingCycle);
      const cancelAtPeriodEnd = subscription.scheduled_change?.action === 'cancel';

      await upsertSubscriptionRecord({
        supabase,
        userId,
        tier,
        status: subscription.status || 'active',
        providerCustomerId: subscription.customer_id || null,
        providerSubscriptionId: subscription.id,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
      });
      await reconcileProfileAccess(supabase, userId);
      break;
    }

    case 'subscription.canceled': {
      const payload = result.payload as PaddleWebhookEnvelope<PaddleSubscriptionData>;
      const subscription = payload.data;
      if (!subscription?.id) {
        break;
      }

      const { data: existing, error: lookupError } = await (supabase.from('subscriptions') as any)
        .select('user_id')
        .eq('provider_subscription_id', subscription.id)
        .maybeSingle();
      if (lookupError) {
        throw new Error(`Paddle cancellation lookup failed: ${lookupError.message}`);
      }

      if (!existing?.user_id) {
        break;
      }

      const { error: updateError } = await (supabase.from('subscriptions') as any)
        .update({
          status: 'canceled',
          cancel_at_period_end: false,
          current_period_end: subscription.current_billing_period?.ends_at || new Date().toISOString(),
        } as any)
        .eq('provider_subscription_id', subscription.id);
      if (updateError) {
        throw new Error(`Paddle cancellation sync failed: ${updateError.message}`);
      }
      await reconcileProfileAccess(supabase, existing.user_id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
