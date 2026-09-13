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

const ANNUAL_DISCOUNT = 0.2;

export function RolePlanCards({ familyKey, familyLabel, tiers, currentTier, currency, settings }: {
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
  const [billing, setBilling] = useState<'monthly' | 'annual' | 'one_time'>('monthly');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4 text-sm">
        <p className="font-semibold">{familyLabel} plans</p>
        <p className="text-muted-foreground mt-1">Pricing set by ilm AI for {familyLabel.toLowerCase()} accounts — separate from the student plans.</p>
      </div>

      <div className="border-border bg-background/70 inline-flex flex-wrap items-center gap-2 rounded-full border p-1.5">
        {(['monthly', 'annual', 'one_time'] as const).map((option) => (
          <button key={option} type="button" onClick={() => setBilling(option)} className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-all',
            billing === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}>
            {option === 'monthly' ? 'Monthly' : option === 'annual' ? <>Yearly <Badge variant="success" className="ml-2 text-[10px]">20% Off</Badge></> : 'One-time (30 days)'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrent = currentTier === tier.key;
          const isFree = tier.key === 'FREE';
          const displayUsd = billing === 'annual' ? tier.priceUsdMonthly * (1 - ANNUAL_DISCOUNT) : tier.priceUsdMonthly;
          const totalUsd = billing === 'annual' ? displayUsd * 12 : displayUsd;
          const pkrTotal = isFree ? 0 : convertUsdToPkr(totalUsd, settings);
          const Icon = tier.key === 'FREE' ? Sparkles : tier.key === 'PRO' ? Rocket : Crown;
          const iconBg = tier.key === 'FREE' ? 'from-slate-500 to-gray-600' : tier.key === 'PRO' ? 'from-violet-500 to-indigo-600' : 'from-amber-500 to-orange-600';
          return (
            <Card key={tier.key} className={cn(isCurrent && 'border-violet-500/50 shadow-lg shadow-violet-500/10')}>
              <CardContent className="p-6">
                {isCurrent && <Badge variant="default" className="mb-3 bg-violet-600">Current Plan</Badge>}
                {!isFree && billing === 'annual' && <Badge variant="success" className="mb-3">20% Off</Badge>}
                {!isFree && billing === 'one_time' && <Badge variant="warning" className="mb-3">No recurring billing</Badge>}
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${iconBg} shadow-lg`}><Icon className="h-5 w-5 text-white" /></div>
                <h3 className="mb-2 text-xl font-bold">{tier.name}</h3>
                <div className="mb-4">
                  <p className="text-3xl font-bold">{usdSymbol}{formatPrice(totalUsd)}<span className="text-muted-foreground text-sm font-normal">{billing === 'annual' ? '/year' : billing === 'one_time' ? ' one-time' : '/mo'}</span></p>
                  {!isFree && <p className="text-muted-foreground mt-1 text-sm">= {pkrSymbol}{formatPrice(pkrTotal)}{billing === 'annual' ? '/year' : ' one-time'}</p>}
                  {billing === 'one_time' && !isFree && <p className="text-muted-foreground mt-1 text-xs">30-day access, no automatic renewal.</p>}
                  {currency !== 'USD' && currency !== 'PKR' && <p className="text-muted-foreground mt-1 text-xs">{symbol}{formatPrice(totalUsd)}{billing === 'annual' ? '/year' : billing === 'one_time' ? ' one-time' : '/mo'}</p>}
                </div>
                <div className="border-primary/25 from-primary/10 to-primary/5 mb-5 rounded-2xl border bg-gradient-to-br p-4"><p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">Includes</p><p className="mt-1 text-sm font-semibold">{tier.limitLabel}</p></div>
                <ul className="mb-6 space-y-2"><li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-green-500" /> Full ilm AI access for this account</li></ul>
                {isCurrent || isFree ? <Button variant="outline" className="w-full" disabled>{isCurrent ? 'Current Plan' : 'Free Plan'}</Button> : (
                  <Button asChild className="w-full" variant="gradient"><Link href={`/subscription/${tier.key.toLowerCase()}?billing=${billing}&family=${familyKey}`}>Checkout {tier.name}</Link></Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function formatPrice(value: number) { return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
