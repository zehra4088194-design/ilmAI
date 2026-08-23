'use client';

import { Check, Crown, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { CURRENCY_SYMBOLS, type Currency } from '@/lib/constants';
import { convertUsdToPkr, type PlatformSettings } from '@/lib/platform-settings/shared';

const SUPPORT_EMAIL = 'ilmai.study1@gmail.com';

export type RolePlanTierCard = {
  key: 'FREE' | 'PRO' | 'ELITE';
  name: string;
  priceUsdMonthly: number;
  limitLabel: string;
};

// Parent/teacher/university plan pricing only has a single admin-configured monthly USD price per
// tier (no annual option, no native PKR figure the way the student subscriptionPlans do) — so this
// intentionally skips the monthly/annual toggle and per-currency price object SubscriptionPlans
// uses. Checkout for these families isn't wired to a payment gateway yet (their pricing doesn't
// define an annual rate, which the existing /subscription/[tier] checkout requires), so the CTA
// points at support instead of a broken/mispriced checkout link.
export function RolePlanCards({
  familyLabel,
  tiers,
  currentTier,
  currency,
  settings,
}: {
  familyLabel: string;
  tiers: RolePlanTierCard[];
  currentTier: string;
  currency: Currency;
  settings: PlatformSettings;
}) {
  const symbol = CURRENCY_SYMBOLS[currency];
  const usdSymbol = CURRENCY_SYMBOLS.USD;
  const pkrSymbol = CURRENCY_SYMBOLS.PKR;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4 text-sm">
        <p className="font-semibold">{familyLabel} plans</p>
        <p className="text-muted-foreground mt-1">
          Pricing set by ilm AI for {familyLabel.toLowerCase()} accounts — separate from the student plans.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrent = currentTier === tier.key;
          const isFree = tier.key === 'FREE';
          const pkrPriceMonthly = isFree ? 0 : convertUsdToPkr(tier.priceUsdMonthly, settings);
          const Icon = tier.key === 'FREE' ? Sparkles : tier.key === 'PRO' ? Rocket : Crown;
          const iconBg =
            tier.key === 'FREE'
              ? 'from-slate-500 to-gray-600'
              : tier.key === 'PRO'
                ? 'from-violet-500 to-indigo-600'
                : 'from-amber-500 to-orange-600';

          return (
            <Card key={tier.key} className={cn(isCurrent && 'border-violet-500/50 shadow-lg shadow-violet-500/10')}>
              <CardContent className="p-6">
                {isCurrent && (
                  <Badge variant="default" className="mb-3 bg-violet-600">
                    Current Plan
                  </Badge>
                )}
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${iconBg} shadow-lg`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{tier.name}</h3>
                <div className="mb-4">
                  <p className="text-3xl font-bold">
                    {usdSymbol}
                    {formatPrice(tier.priceUsdMonthly)}
                    <span className="text-muted-foreground text-sm font-normal">/mo</span>
                  </p>
                  {!isFree && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      = {pkrSymbol}
                      {formatPrice(pkrPriceMonthly)}/mo
                    </p>
                  )}
                  {currency !== 'USD' && currency !== 'PKR' && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {symbol}
                      {formatPrice(tier.priceUsdMonthly)}/mo
                    </p>
                  )}
                </div>
                <div className="border-primary/25 from-primary/10 to-primary/5 mb-5 rounded-2xl border bg-gradient-to-br p-4">
                  <p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">Includes</p>
                  <p className="mt-1 text-sm font-semibold">{tier.limitLabel}</p>
                </div>
                <ul className="mb-6 space-y-2">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-green-500" /> Full ilm AI access for this account
                  </li>
                </ul>

                {isCurrent || isFree ? (
                  <Button variant="outline" className="w-full" disabled>
                    {isCurrent ? 'Current Plan' : 'Free Plan'}
                  </Button>
                ) : (
                  <Button asChild className="w-full" variant="gradient">
                    <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Upgrade to ${tier.name} (${familyLabel})`)}`}>
                      Contact us to upgrade
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function formatPrice(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
