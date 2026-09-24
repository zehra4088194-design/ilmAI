'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Crown, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CURRENCY_SYMBOLS, TRANSACTION_FEE_USD, type Currency } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { DEFAULT_PLATFORM_SETTINGS, convertUsdToPkr, type PlatformSettings } from '@/lib/platform-settings/shared';
import type { PaymentAvailability } from '@/lib/payments';

type BillingCycle = 'monthly' | 'annual';
type TierKey = 'FREE' | 'PRO' | 'ELITE';
const PLAN_KEYS: TierKey[] = ['FREE', 'PRO', 'ELITE'];

export function SubscriptionPlans({
  currentTier,
  paymentAvailability,
  currency,
  settings = DEFAULT_PLATFORM_SETTINGS,
}: {
  currentTier: string;
  paymentAvailability: PaymentAvailability;
  currency: Currency;
  settings?: PlatformSettings;
}) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const searchParams = useSearchParams();
  const symbol = CURRENCY_SYMBOLS[currency];
  const usdSymbol = CURRENCY_SYMBOLS.USD;
  const pkrSymbol = CURRENCY_SYMBOLS.PKR;
  const free = settings.subscriptionPlans.FREE;
  const pro = settings.subscriptionPlans.PRO;
  const elite = settings.subscriptionPlans.ELITE;
  const feePkr = convertUsdToPkr(TRANSACTION_FEE_USD, settings);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment received. Your plan is syncing.');
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout was cancelled.');
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4 text-sm">
        <p id="credits" className="font-semibold">
          One shared AI credit pool
        </p>
        <p className="text-muted-foreground mt-2">
          Free: {free.limits.aiCreditsWeekly} credits/week. Pro: {pro.limits.aiCreditsMonthly}/month, max{' '}
          {pro.limits.aiCreditsDaily}/day. Elite: {elite.limits.aiCreditsMonthly}/month, max{' '}
          {elite.limits.aiCreditsDaily}/day plus {elite.limits.premiumAiMonthly} premium calls/month.
        </p>
        <div className="text-muted-foreground mt-3 flex flex-wrap gap-2 text-xs">
          {[
            ['Tutor / side chat', 1],
            ['Printed scan', 1],
            ['Handwritten scan', 3],
            ['Roadmap / flashcards / practice', 2],
            ['Summary', 4],
            ['PharmaPulse', 5],
            ['Full test / guess paper', 4],
            ['Presentation', 8],
          ].map(([label, cost]) => (
            <span key={String(label)} className="border-border/70 bg-background/50 rounded-full border px-2.5 py-1">
              {label}: <strong className="text-foreground">{cost}</strong>
            </span>
          ))}
        </div>
      </div>

      {paymentAvailability.consumptionOnly && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm">
          <p className="font-semibold">The Play Store app is in consumption-only mode</p>
          <p className="text-muted-foreground mt-1">
            Existing plans are used and synced here. External checkout and institutional purchase inquiries are not
            available in this app build.
          </p>
        </div>
      )}

      <div className="border-border bg-background/70 inline-flex items-center gap-3 rounded-full border p-1.5">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-all',
            billingCycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle('annual')}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-all',
            billingCycle === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          Yearly
          <Badge variant="success" className="ml-2 text-[10px]">
            20% Off
          </Badge>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLAN_KEYS.filter((key) => settings.subscriptionPlans[key].enabled).map((key) => {
          const plan = settings.subscriptionPlans[key];
          const isCurrent = currentTier === key;
          const isFree = key === 'FREE';
          const usdPricing = plan.price.USD;
          const pkrPricing = plan.price.PKR;
          const displayPrice = billingCycle === 'annual' && !isFree ? usdPricing.annual : usdPricing.monthly;
          const pkrDisplayPrice = billingCycle === 'annual' && !isFree ? pkrPricing.annual : pkrPricing.monthly;
          const priceSuffix = billingCycle === 'annual' && !isFree ? '/year' : '/mo';
          const monthlyEquivalent = billingCycle === 'annual' && !isFree ? usdPricing.annual / 12 : null;
          const pkrMonthlyEquivalent = billingCycle === 'annual' && !isFree ? pkrPricing.annual / 12 : null;
          const creditAmount = isFree ? plan.limits.aiCreditsWeekly : plan.limits.aiCreditsMonthly;
          const creditPeriod = isFree ? 'every week' : 'every month';
          const PlanIcon = key === 'FREE' ? Sparkles : key === 'PRO' ? Rocket : Crown;
          const iconBg =
            key === 'FREE'
              ? 'from-slate-500 to-gray-600'
              : key === 'PRO'
                ? 'from-violet-500 to-indigo-600'
                : 'from-amber-500 to-orange-600';

          return (
            <Card key={key} className={cn(isCurrent && 'border-violet-500/50 shadow-lg shadow-violet-500/10')}>
              <CardContent className="p-6">
                {isCurrent && (
                  <Badge variant="default" className="mb-3 bg-violet-600">
                    Current Plan
                  </Badge>
                )}
                {billingCycle === 'annual' && !isFree && (
                  <div className="mb-3">
                    <Badge
                      className={cn(
                        'rounded-full border-0 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-white uppercase',
                        key === 'ELITE'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                          : 'bg-gradient-to-r from-violet-500 to-indigo-600'
                      )}
                    >
                      20% Off
                    </Badge>
                  </div>
                )}
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${iconBg} shadow-lg`}
                >
                  <PlanIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{plan.name}</h3>
                <div className="mb-4">
                  <p className="text-3xl font-bold">
                    {usdSymbol}
                    {formatPrice(displayPrice, 'USD')}
                    <span className="text-muted-foreground text-sm font-normal">{priceSuffix}</span>
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    = {pkrSymbol}
                    {formatPrice(pkrDisplayPrice, 'PKR')}
                    <span className="text-xs"> {priceSuffix}</span>
                  </p>
                  {!isFree && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      +{usdSymbol}
                      {TRANSACTION_FEE_USD.toFixed(2)} transaction fee ({pkrSymbol}
                      {formatPrice(feePkr, 'PKR')})
                    </p>
                  )}
                  {monthlyEquivalent !== null && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {usdSymbol}
                      {formatPrice(monthlyEquivalent, 'USD')}/mo effective
                      <span className="ml-1 text-xs">
                        = {pkrSymbol}
                        {formatPrice(pkrMonthlyEquivalent || 0, 'PKR')}/mo
                      </span>
                    </p>
                  )}
                </div>
                <div className="border-primary/25 from-primary/10 to-primary/5 mb-5 rounded-2xl border bg-gradient-to-br p-4">
                  <p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">AI Credits</p>
                  <p className="mt-1 text-2xl font-bold">{creditAmount.toLocaleString()}</p>
                  <p className="text-muted-foreground text-xs">
                    Shared credits {creditPeriod}
                    {plan.limits.aiCreditsDaily > 0 ? ` - up to ${plan.limits.aiCreditsDaily}/day` : ''}
                  </p>
                </div>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent || isFree ? (
                  <Button variant="outline" className="w-full" disabled>
                    {isCurrent ? 'Current Plan' : 'Free Plan'}
                  </Button>
                ) : paymentAvailability.consumptionOnly ? (
                  <Button variant="outline" className="w-full" disabled>
                    Existing subscriptions only
                  </Button>
                ) : currentTier === 'PRO' || currentTier === 'ELITE' ? (
                  <Button variant="outline" className="w-full" disabled>
                    Contact support to change plan
                  </Button>
                ) : (
                  <Button asChild className="w-full" variant="gradient">
                    <Link href={`/subscription/${key.toLowerCase()}?billing=${billingCycle}`}>
                      Checkout {plan.name}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Institutional plans (school/college inquiry) are intentionally NOT shown here — an
          individual student/parent/teacher account has nothing to do with buying a school-wide
          plan. That inquiry form still lives on the public marketing pricing page
          (PricingSection) for prospective institution buyers, and real institution owners/admins
          get the actual working checkout at /school-admin/settings or /college-admin/settings
          (InstitutionPaymentCheckout) — not this generic per-user page. */}
    </div>
  );
}

function formatPrice(value: number, currency: Currency) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  });
}
