import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { ManualUpgradePage } from '@/components/features/subscription/ManualUpgradePage';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPaymentAvailability } from '@/lib/payments';
import { generatePaymentQR } from '@/lib/payments/paymentQr';
import { createClient } from '@/lib/supabase/server';
import { getCurrencyForBoard, getCurrencyForCountry } from '@/lib/constants';

export const metadata: Metadata = { title: 'Upgrade Plan' };

export default async function UpgradePlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ tier: string }>;
  searchParams: Promise<{ billing?: string }>;
}) {
  const { tier } = await params;
  const { billing } = await searchParams;
  const normalized = tier.toUpperCase();
  if (normalized !== 'PRO' && normalized !== 'ELITE') notFound();
  const settings = await getPlatformSettings();
  const requestHeaders = await headers();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('board, subscription_tier').eq('id', user.id).maybeSingle()
    : { data: null };
  if (profile?.subscription_tier === 'ELITE' || profile?.subscription_tier === normalized) {
    redirect('/subscription');
  }
  const requestCountry = requestHeaders.get('cf-ipcountry') || requestHeaders.get('x-country-code');
  const currency = profile?.board ? getCurrencyForBoard(profile.board) : getCurrencyForCountry(requestCountry || 'PK');
  const activeSubscriptionLookup = user
    ? await (supabase.from('subscriptions') as any)
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing', 'past_due'])
        .gt('current_period_end', new Date().toISOString())
        .limit(1)
    : { data: [], error: null };
  const hasActiveSubscription = Boolean(activeSubscriptionLookup.error || activeSubscriptionLookup.data?.length);

  // The wallet QR always encodes the PKR price (it's only shown once the
  // checkout country is Pakistan) and is generated server-side per the
  // known-working payload format in lib/payments/paymentQr.ts — never
  // client-side, and never from a hardcoded amount.
  const normalizedBilling = billing === 'annual' ? 'annual' : 'monthly';
  const plan = settings.subscriptionPlans[normalized as 'PRO' | 'ELITE'];
  const pkrAmount = normalizedBilling === 'annual' ? plan.price.PKR.annual : plan.price.PKR.monthly;
  const walletQr = pkrAmount > 0 ? await generatePaymentQR(pkrAmount) : null;

  return (
    <ManualUpgradePage
      tier={normalized}
      billing={normalizedBilling}
      settings={settings}
      paymentAvailability={getPaymentAvailability(requestHeaders)}
      hasActiveSubscription={hasActiveSubscription}
      currency={currency}
      walletQrDataUrl={walletQr?.qrDataUrl ?? null}
    />
  );
}
