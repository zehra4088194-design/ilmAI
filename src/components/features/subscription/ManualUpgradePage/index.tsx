'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Copy, Crown, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CURRENCY_SYMBOLS, MANUAL_PAYMENT_OPTIONS } from '@/lib/constants';
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from '@/lib/platform-settings/shared';
import { toast } from 'sonner';

type BillingCycle = 'monthly' | 'annual';

export function ManualUpgradePage({ tier, billing, settings = DEFAULT_PLATFORM_SETTINGS }: { tier: 'PRO' | 'ELITE'; billing: BillingCycle; settings?: PlatformSettings }) {
  const plan = settings.subscriptionPlans[tier];
  const price = billing === 'annual' ? plan.price.PKR.annual : plan.price.PKR.monthly;
  const Icon = tier === 'PRO' ? Rocket : Crown;
  const highlight = tier === 'PRO' ? 'from-violet-500 to-indigo-600' : 'from-amber-500 to-orange-600';
  const benefits = useMemo(() => plan.features.slice(0, 4), [plan.features]);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success('Copied');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/subscription"><ArrowLeft className="h-4 w-4" />Back to plans</Link></Button>

      <Card className="overflow-hidden border-violet-500/30">
        <div className={`bg-gradient-to-r ${highlight} p-6 text-white`}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <Badge className="mb-2 bg-white/20 text-white hover:bg-white/20">{billing === 'annual' ? 'Yearly' : 'Monthly'} plan</Badge>
              <h1 className="text-3xl font-bold">Go {plan.name}</h1>
              <p className="mt-1 text-white/85">{CURRENCY_SYMBOLS.PKR}{price.toLocaleString()} {billing === 'annual' ? '/year' : '/month'}</p>
            </div>
          </div>
        </div>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 rounded-xl border bg-muted/20 p-3 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {benefit}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <h2 className="text-lg font-bold">Payment ka tareeqa</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Neeche diye gaye Easypaisa ya JazzCash number par exact amount send karo, phir payment screenshot aur apna account email bhejo.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {MANUAL_PAYMENT_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => copy(option.number)}
                  className="flex items-center justify-between rounded-xl border bg-background p-4 text-left transition-colors hover:border-violet-500/50"
                >
                  <div>
                    <p className="font-bold">{option.label}</p>
                    <p className="text-lg font-semibold">{option.number}</p>
                  </div>
                  <Copy className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-bold">Activation</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Screenshot aur registered email `zehra4088194@gmail.com` par send karo. Verification ke baad admin panel se tumhara plan activate ho jayega.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
