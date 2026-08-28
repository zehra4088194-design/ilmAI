'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Crown, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { CURRENCY_SYMBOLS, type Currency } from '@/lib/constants';
import { convertUsdToPkr, type PlatformSettings } from '@/lib/platform-settings/shared';

export type RolePlanTierCard = {
  key: 'FREE' | 'PRO' | 'ELITE';
  name: string;
  priceUsdMonthly: number;
  limitLabel: string;
};

export type RolePlanFamilyKey = 'parent' | 'teacher' | 'university';

// Parent/teacher/university plan pricing only has a single admin-configured MONTHLY USD price per
// tier — there's no separate "annual price" admin field. Annual here is always that monthly price
// × 12 at a fixed 20% discount, same math as the "Save 20%" badge on the student plans, computed
// client-side rather than stored. "Checkout" is a plain link into the same /subscription/[tier]
// page (with ?family= added) the student plans use — that page shows both the Paddle card option
// and the JazzCash/Easypaisa QR option, same full checkout experience students get, not a
// stripped-down parent/teacher/university-only flow.
const ANNUAL_DISCOUNT = 0.2;

export function RolePlanCards({
  familyKey,
  familyLabel,
  tiers,
  currentTier,
  currency,
  settings,
}: {
  familyKey: RolePlanFamilyKey;
  familyLabel: string;
  tiers: RolePlanTierCard[];
  currentTier: string;
  currency: Currency;
  settings: PlatformSettings;
}) {
  const symbol = CURRENCY_SYMBOLS[currency];
  const usdSymbol = CURRENCY_SYMBOLS.USD;
  const pkrSymbol = CURRENCY_SYMBOLS.PKR;
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4 text-sm">
        <p className="font-semibold">{familyLabel} plans</p>
        <p className="text-muted-foreground mt-1">
          Pricing set by ilm AI for {familyLabel.toLowerCase()} accounts — separate from the student plans.
        </p>
      </div>

      <div className="border-border bg-background/70 inline-flex items-center gap-3 rounded-full border p-1.5">
        <button
          type="button"
          onClick={() => setIsAnnual(false)}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-all',
            !isAnnual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setIsAnnual(true)}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-all',
            isAnnual ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          Yearly
          <Badge variant="success" className="ml-2 text-[10px]">
            20% Off
          </Badge>
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrent = currentTier === tier.key;
          const isFree = tier.key === 'FREE';
          const annualUsdMonthlyEquivalent = tier.priceUsdMonthly * (1 - ANNUAL_DISCOUNT);
          const displayUsdMonthly = isAnnual ? annualUsdMonthlyEquivalent : tier.priceUsdMonthly;
          const usdTotal = isAnnual ? displayUsdMonthly * 12 : displayUsdMonthly;
          const pkrTotal = isFree ? 0 : convertUsdToPkr(usdTotal, settings);
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
                {isAnnual && !isFree && (
                  <div className="mb-3">
                    <Badge
                      className={cn(
                        'rounded-full border-0 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-white uppercase',
                        tier.key === 'ELITE'
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
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{tier.name}</h3>
                <div className="mb-4">
                  <p className="text-3xl font-bold">
                    {usdSymbol}
                    {formatPrice(usdTotal)}
                    <span className="text-muted-foreground text-sm font-normal">{isAnnual ? '/year' : '/mo'}</span>
                  </p>
                  {!isFree && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      = {pkrSymbol}
                      {formatPrice(pkrTotal)}
                      {isAnnual ? '/year' : '/mo'}
                    </p>
                  )}
                  {isAnnual && !isFree && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {usdSymbol}
                      {formatPrice(displayUsdMonthly)}/mo effective
                    </p>
                  )}
                  {currency !== 'USD' && currency !== 'PKR' && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {symbol}
                      {formatPrice(usdTotal)}
                      {isAnnual ? '/year' : '/mo'}
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
                    <Link
                      href={`/subscription/${tier.key.toLowerCase()}?billing=${isAnnual ? 'annual' : 'monthly'}&family=${familyKey}`}
                    >
                      Checkout {tier.name}
                    </Link>
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
