import { notFound } from 'next/navigation';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { convertUsdToPkr } from '@/lib/platform-settings/shared';
import { TRANSACTION_FEE_USD } from '@/lib/constants';
import { generatePaymentQR } from '@/lib/payments/paymentQr';
import { ParentPlanCheckout } from '@/components/features/parent/ParentPlanCheckout';

export const metadata = { title: 'Parent Plan Checkout | ilm AI' };

export default async function ParentPricingCheckoutPage({ params }: { params: Promise<{ tier: string }> }) {
  const { tier } = await params;
  if (tier !== 'paid' && tier !== 'elite') notFound();

  const settings = await getPlatformSettings();
  const plan = settings.parentPlans[tier];
  const pkrPrice = convertUsdToPkr(plan.priceUsdMonthly, settings);
  const feePkr = convertUsdToPkr(TRANSACTION_FEE_USD, settings);
  const totalPkr = pkrPrice + feePkr;
  // Same JazzCash merchant account as consumer/institutional checkout — explicitly confirmed
  // intentional (not a mistake) with the app owner, see lib/payments/paymentQr.ts's own comment.
  const walletQr = totalPkr > 0 ? await generatePaymentQR(totalPkr) : null;

  return (
    <ParentPlanCheckout
      tier={tier}
      priceUsd={plan.priceUsdMonthly}
      pkrPrice={pkrPrice}
      feePkr={feePkr}
      totalPkr={totalPkr}
      childrenMax={plan.childrenMax}
      walletQrDataUrl={walletQr?.qrDataUrl ?? null}
    />
  );
}
