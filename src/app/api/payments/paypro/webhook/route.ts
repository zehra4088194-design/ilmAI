import { NextRequest, NextResponse } from 'next/server';
import { getPaymentProviderById } from '@/lib/payments';
import { selectEffectiveSubscription } from '@/lib/payments/subscription-access';
import { createAdminClient } from '@/lib/supabase/server';

type PayProTier = 'FREE' | 'PRO' | 'ELITE';
type PayProBillingCycle = 'monthly' | 'annual';

type PayProWebhookPayload = {
  event?: string;
  event_type?: string;
  status?: string;
  reference?: string;
  user_id?: string;
  customer_id?: string;
  customer_email?: string;
  subscription_id?: string;
  transaction_id?: string;
  tier?: string;
  billing_cycle?: string;
  current_period_start?: string;
  current_period_end?: string;
};

function normalizeTier(value?: string | null): PayProTier {
  return value === 'PRO' || value === 'ELITE' ? value : 'FREE';
}

function normalizeBillingCycle(value?: string | null): PayProBillingCycle {
  return value === 'annual' ? 'annual' : 'monthly';
}

function addBillingPeriod(startAt: string, billingCycle: PayProBillingCycle) {
  const date = new Date(startAt);
  if (billingCycle === 'annual') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString();
}

function isPaidEvent(eventType?: string) {
  const normalized = (eventType || '').toLowerCase();
  return ['paid', 'success', 'completed', 'subscription.active', 'subscription.created'].some((value) =>
    normalized.includes(value)
  );
}

function isCanceledEvent(eventType?: string) {
  const normalized = (eventType || '').toLowerCase();
  return ['cancel', 'expired', 'failed'].some((value) => normalized.includes(value));
}

async function reconcileProfileAccess(supabase: Awaited<ReturnType<typeof createAdminClient>>, userId: string) {
  const { data, error } = await (supabase.from('subscriptions') as any)
    .select('tier, status, current_period_end')
    .eq('user_id', userId);
  if (error) {
    throw new Error(`PayPro access reconciliation failed: ${error.message}`);
  }

  const access = selectEffectiveSubscription(data || []);
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_tier: access.tier,
      subscription_expires_at: access.expiresAt,
    })
    .eq('id', userId);
  if (profileError) {
    throw new Error(`PayPro profile sync failed: ${profileError.message}`);
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paypro-signature') || req.headers.get('authorization');
  const provider = getPaymentProviderById('paypro');
  const result = await provider.verifyWebhook(rawBody, signature?.replace(/^Bearer\s+/i, '') || null);

  if (!result.valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const payload = result.payload as PayProWebhookPayload;
  const eventType = result.eventType || payload.status;
  const referenceParts = payload.reference?.split(':') || [];
  const userId = payload.user_id || referenceParts[0];
  const tier = normalizeTier(payload.tier || referenceParts[1]);
  const billingCycle = normalizeBillingCycle(payload.billing_cycle || referenceParts[2]);
  const subscriptionId = payload.subscription_id || payload.transaction_id || payload.reference;

  if (!userId || tier === 'FREE' || !subscriptionId) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const supabase = await createAdminClient();

  if (isPaidEvent(eventType)) {
    const currentPeriodStart = payload.current_period_start || new Date().toISOString();
    const currentPeriodEnd = payload.current_period_end || addBillingPeriod(currentPeriodStart, billingCycle);
    const { error } = await (supabase.from('subscriptions') as any).upsert(
      {
        user_id: userId,
        provider: 'paypro',
        provider_customer_id: payload.customer_id || payload.customer_email || null,
        provider_subscription_id: subscriptionId,
        tier,
        status: 'active',
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: false,
      } as any,
      { onConflict: 'provider_subscription_id' }
    );
    if (error) {
      throw new Error(`PayPro subscription sync failed: ${error.message}`);
    }
    await reconcileProfileAccess(supabase, userId);
  } else if (isCanceledEvent(eventType)) {
    const { error } = await (supabase.from('subscriptions') as any)
      .update({
        status: 'canceled',
        cancel_at_period_end: false,
        current_period_end: new Date().toISOString(),
      } as any)
      .eq('provider_subscription_id', subscriptionId);
    if (error) {
      throw new Error(`PayPro cancellation sync failed: ${error.message}`);
    }
    await reconcileProfileAccess(supabase, userId);
  }

  return NextResponse.json({ received: true });
}
