'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Copy, CreditCard, Crown, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CURRENCY_SYMBOLS, MANUAL_PAYMENT_OPTIONS, TRANSACTION_FEE_USD, type Currency } from '@/lib/constants';
import { DEFAULT_PLATFORM_SETTINGS, convertUsdToPkr, type PlatformSettings } from '@/lib/platform-settings/shared';
import type { PaymentAvailability } from '@/lib/payments';

type BillingCycle = 'monthly' | 'annual';
type CheckoutCountry = 'PK' | 'OTHER';
type CheckoutMethod = 'card' | 'wallet';

// The generic student plan (settings.subscriptionPlans[tier]) has a full shape — per-currency
// price object, features list, name — that parent/teacher/university plans don't (they're just
// {priceUsdMonthly, a limit field} in admin settings). `overridePlan` lets a caller synthesize that
// same shape from whichever family's settings apply, so this page/component doesn't need a second
// copy of the card/QR/Paddle UI — see /subscription/[tier]/page.tsx for how it's built.
type OverridePlan = {
  name: string;
  price: { USD: { monthly: number; annual: number }; PKR: { monthly: number; annual: number } };
  features: string[];
};

export function ManualUpgradePage({
  tier,
  billing,
  settings = DEFAULT_PLATFORM_SETTINGS,
  paymentAvailability,
  hasActiveSubscription,
  currency,
  walletQrDataUrl,
  planFamily,
  overridePlan,
}: {
  tier: 'PRO' | 'ELITE';
  billing: BillingCycle;
  settings?: PlatformSettings;
  paymentAvailability: PaymentAvailability;
  hasActiveSubscription: boolean;
  currency: Currency;
  // Server-generated dynamic payment QR (lib/payments/paymentQr.ts) for today's
  // PKR price — null while that amount is 0 (e.g. a misconfigured plan).
  walletQrDataUrl?: string | null;
  // Set together: planFamily tells /api/payments/create-session which Paddle price id to use
  // (FAMILY_PRICE_IDS in paddle.ts); overridePlan supplies that family's price/name/features
  // instead of the generic student plan.
  planFamily?: 'parent' | 'teacher' | 'university';
  overridePlan?: OverridePlan;
}) {
  const plan = overridePlan ?? settings.subscriptionPlans[tier];
  const [country, setCountry] = useState<CheckoutCountry>(currency === 'PKR' ? 'PK' : 'OTHER');
  const [method, setMethod] = useState<CheckoutMethod>('card');
  const displayCurrency: Currency = country === 'PK' ? 'PKR' : 'USD';
  const price = billing === 'annual' ? plan.price[displayCurrency].annual : plan.price[displayCurrency].monthly;
  const usdPrice = billing === 'annual' ? plan.price.USD.annual : plan.price.USD.monthly;
  // Flat processing fee, on top of every price shown — the wallet total below actually asks for
  // price + this fee (it's a manual bank transfer, so the amount requested is the real amount
  // due); the card price display just notes it alongside, since Paddle's own configured price is
  // what's actually charged there.
  const feePkr = convertUsdToPkr(TRANSACTION_FEE_USD, settings);
  const feeDisplay =
    displayCurrency === 'USD'
      ? `+$${TRANSACTION_FEE_USD.toFixed(2)} transaction fee`
      : `+Rs. ${feePkr.toLocaleString('en-US')} transaction fee`;
  // The wallet method only ever shows when displayCurrency is already 'PKR' (country === 'PK'),
  // so `price` here is always the PKR price — this is the actual amount to request from the payer.
  const walletTotalPkr = price + feePkr;
  const Icon = tier === 'PRO' ? Rocket : Crown;
  const highlight = tier === 'PRO' ? 'from-violet-500 to-indigo-600' : 'from-amber-500 to-orange-600';
  const benefits = useMemo(() => plan.features.slice(0, 6), [plan.features]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success('Copied');
  };

  const beginCheckout = async (provider: 'paddle' | 'paypro') => {
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billingCycle: billing, provider, planFamily }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout could not be started.');
      window.location.assign(payload.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Checkout could not be started.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/subscription">
          <ArrowLeft className="h-4 w-4" />
          Back to plans
        </Link>
      </Button>

      <Card className="overflow-hidden border-violet-500/30">
        <div className={`bg-gradient-to-r ${highlight} p-6 text-white`}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <Badge className="mb-2 bg-white/20 text-white hover:bg-white/20">
                {billing === 'annual' ? 'Yearly' : 'Monthly'} plan
              </Badge>
              <h1 className="text-3xl font-bold">Go {plan.name}</h1>
              <p className="mt-1 text-white/85">
                {CURRENCY_SYMBOLS[displayCurrency]}
                {formatPrice(price, displayCurrency)} {billing === 'annual' ? '/year' : '/month'}
                <span className="ml-2 text-sm text-white/70">{feeDisplay}</span>
              </p>
            </div>
          </div>
        </div>

        <CardContent className="space-y-5 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="bg-muted/20 flex items-center gap-2 rounded-xl border p-3 text-sm font-medium"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                {benefit}
              </div>
            ))}
          </div>

          {!paymentAvailability.consumptionOnly && !hasActiveSubscription && (
            <div className="bg-muted/20 grid gap-4 rounded-2xl border p-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold">
                <span>Billing country</span>
                <select
                  value={country}
                  onChange={(event) => {
                    const nextCountry = event.target.value as CheckoutCountry;
                    setCountry(nextCountry);
                    setMethod('card');
                  }}
                  className="bg-background h-11 w-full rounded-xl border px-3 font-normal"
                >
                  <option value="PK">Pakistan</option>
                  <option value="OTHER">Other country</option>
                </select>
              </label>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Payment method</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setMethod('card')}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                      method === 'card' ? 'border-primary bg-primary/10 text-primary' : 'bg-background'
                    }`}
                  >
                    Visa / Mastercard
                  </button>
                  {country === 'PK' && (
                    <button
                      type="button"
                      onClick={() => setMethod('wallet')}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                        method === 'wallet' ? 'border-primary bg-primary/10 text-primary' : 'bg-background'
                      }`}
                    >
                      Local wallet
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {paymentAvailability.consumptionOnly ? (
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
              <h2 className="text-lg font-bold">Existing subscription access</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                External checkout is not shown in the Play Store app. An active plan purchased on the web will sync
                automatically with your account.
              </p>
            </div>
          ) : hasActiveSubscription ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
              <h2 className="text-lg font-bold">Paid plan already active</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                New checkout is blocked to prevent duplicate subscriptions and double charges. Contact support to
                change your plan or billing cycle.
              </p>
            </div>
          ) : method === 'card' ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <h2 className="text-lg font-bold">Visa / Mastercard subscription</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Paddle handles recurring USD billing, 3D Secure, receipts, and automatic monthly renewal. International
                online payments must be enabled by your Pakistani bank card.
              </p>
              <Button
                type="button"
                variant="gradient"
                className="mt-4 w-full sm:w-auto"
                disabled={!paymentAvailability.paddleConfigured}
                loading={checkoutLoading}
                onClick={() => beginCheckout('paddle')}
              >
                <CreditCard className="h-4 w-4" /> Pay ${formatPrice(usdPrice, 'USD')} by card
              </Button>
              <p className="text-muted-foreground mt-2 text-xs">
                +${TRANSACTION_FEE_USD.toFixed(2)} transaction fee applies on top of the price shown.
              </p>
              {!paymentAvailability.paddleConfigured && (
                <p className="text-muted-foreground mt-3 text-xs">
                  Checkout will become active after Paddle keys and matching USD price IDs are configured.
                </p>
              )}
            </div>
          ) : null}

          {!paymentAvailability.consumptionOnly && !hasActiveSubscription && country === 'PK' && method === 'wallet' && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
              <h2 className="text-lg font-bold">JazzCash</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Send exactly Rs. {formatPrice(walletTotalPkr, 'PKR')} (Rs. {formatPrice(price, 'PKR')} plan price + Rs.{' '}
                {formatPrice(feePkr, 'PKR')} transaction fee), then send the transaction screenshot and registered
                account email to support. The plan will be activated by an admin after verification.
              </p>
              <div className="mt-4 space-y-3">
                {MANUAL_PAYMENT_OPTIONS.map((option) => (
                  <div
                    key={option.label}
                    className="bg-background flex flex-col items-center gap-4 rounded-xl border p-4 text-center sm:flex-row sm:text-left"
                  >
                    {/* Server-generated dynamic payment QR (today's price + Asia/Karachi
                        23:59 expiry, CRC recalculated every time — see
                        lib/payments/paymentQr.ts). p-4 keeps a wide white quiet zone
                        around the modules so an in-app scanner can lock on reliably. */}
                    <div className="rounded-lg bg-white p-4">
                      {walletQrDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- data: URL, Next/Image doesn't optimize these
                        <img src={walletQrDataUrl} alt={`${option.label} payment QR`} width={132} height={132} />
                      ) : (
                        <div className="text-muted-foreground flex h-[132px] w-[132px] items-center justify-center text-center text-xs">
                          QR unavailable
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">{option.label}</p>
                      <p className="text-lg font-bold">Rs. {formatPrice(walletTotalPkr, 'PKR')}</p>
                      <p className="text-muted-foreground text-sm">{option.accountName}</p>
                      <button
                        type="button"
                        onClick={() => copy(option.number)}
                        className="mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors hover:border-amber-500/50"
                      >
                        {option.number}
                        <Copy className="text-muted-foreground h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-4 text-xs">
                Send proof and your registered email to `ilmai.study1@gmail.com`, or send the transaction screenshot on{' '}
                <a href="/api/support/contact?via=whatsapp" className="font-semibold underline underline-offset-2">
                  WhatsApp
                </a>
                . Never share an OTP or wallet PIN.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatPrice(value: number, currency: Currency) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  });
}
