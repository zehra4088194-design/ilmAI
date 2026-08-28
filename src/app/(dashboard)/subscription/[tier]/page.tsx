import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { ManualUpgradePage } from '@/components/features/subscription/ManualUpgradePage';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPaymentAvailability } from '@/lib/payments';
import { generatePaymentQR } from '@/lib/payments/paymentQr';
import { createClient } from '@/lib/supabase/server';
import { getCurrencyForBoard, getCurrencyForCountry, TRANSACTION_FEE_USD } from '@/lib/constants';
import { convertUsdToPkr } from '@/lib/platform-settings/shared';

export const metadata: Metadata = { title: 'Upgrade Plan' };

type RolePlanFamily = 'parent' | 'teacher' | 'university';

// Builds the same {name, price, features} shape settings.subscriptionPlans[tier] has, from
// whichever family's admin settings apply — parentPlans/teacherPlans/universityPlans only ever
// store {priceUsdMonthly, one limit field} per tier, no PKR/annual breakdown, no name, no features
// array, so ManualUpgradePage can't read them directly the way it reads the generic student plan.
// Annual is always monthly x12 at a fixed 20% off (same math RolePlanCards uses to display it).
function buildFamilyPlan(
  family: RolePlanFamily,
  tier: 'PRO' | 'ELITE',
  settings: Awaited<ReturnType<typeof getPlatformSettings>>
) {
  const tierKey = tier === 'PRO' ? 'paid' : 'elite';
  const { priceUsdMonthly, limitLabel } =
    family === 'parent'
      ? {
          priceUsdMonthly: settings.parentPlans[tierKey].priceUsdMonthly,
          limitLabel: `${settings.parentPlans[tierKey].childrenMax ?? 'Unlimited'} children linked`,
        }
      : family === 'teacher'
        ? {
            priceUsdMonthly: settings.teacherPlans[tierKey].priceUsdMonthly,
            limitLabel: `${settings.teacherPlans[tierKey].classroomsMax ?? 'Unlimited'} classrooms`,
          }
        : {
            priceUsdMonthly: settings.universityPlans[tierKey].priceUsdMonthly,
            limitLabel: `${settings.universityPlans[tierKey].aiCreditsMonthly.toLocaleString()} AI credits/month`,
          };
  const usdMonthly = priceUsdMonthly;
  const usdAnnual = Math.round(priceUsdMonthly * 12 * 0.8 * 100) / 100;
  const pkrMonthly = Math.round(usdMonthly * settings.exchangeRate.usdToPkr);
  const pkrAnnual = Math.round(usdAnnual * settings.exchangeRate.usdToPkr);
  const familyLabel = family === 'parent' ? 'Parent' : family === 'teacher' ? 'Teacher' : 'University';
  return {
    name: `${familyLabel} ${tier === 'PRO' ? 'Pro' : 'Elite'}`,
    price: {
      USD: { monthly: usdMonthly, annual: usdAnnual },
      PKR: { monthly: pkrMonthly, annual: pkrAnnual },
    },
    features: ['Full ilm AI access for this account', limitLabel],
  };
}

export default async function UpgradePlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ tier: string }>;
  searchParams: Promise<{ billing?: string; family?: string }>;
}) {
  const { tier } = await params;
  const { billing, family: familyParam } = await searchParams;
  const normalized = tier.toUpperCase();
  if (normalized !== 'PRO' && normalized !== 'ELITE') notFound();
  const family: RolePlanFamily | undefined =
    familyParam === 'parent' || familyParam === 'teacher' || familyParam === 'university' ? familyParam : undefined;
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
  // client-side, and never from a hardcoded amount. The flat transaction fee is folded into the
  // encoded amount too, so scanning the QR asks for the real total due, matching the "send
  // exactly Rs. X" total ManualUpgradePage displays next to it.
  const normalizedBilling = billing === 'annual' ? 'annual' : 'monthly';
  const plan = family
    ? buildFamilyPlan(family, normalized as 'PRO' | 'ELITE', settings)
    : settings.subscriptionPlans[normalized as 'PRO' | 'ELITE'];
  const pkrAmount = normalizedBilling === 'annual' ? plan.price.PKR.annual : plan.price.PKR.monthly;
  const pkrAmountWithFee = pkrAmount > 0 ? pkrAmount + convertUsdToPkr(TRANSACTION_FEE_USD, settings) : 0;
  const walletQr = pkrAmountWithFee > 0 ? await generatePaymentQR(pkrAmountWithFee) : null;

  return (
    <ManualUpgradePage
      tier={normalized}
      billing={normalizedBilling}
      settings={settings}
      paymentAvailability={getPaymentAvailability(requestHeaders)}
      hasActiveSubscription={hasActiveSubscription}
      currency={currency}
      walletQrDataUrl={walletQr?.qrDataUrl ?? null}
      planFamily={family}
      overridePlan={family ? plan : undefined}
    />
  );
}
