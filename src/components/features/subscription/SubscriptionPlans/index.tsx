'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Crown, Globe2, Landmark, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SUBSCRIPTION_PLANS, CURRENCY_SYMBOLS, getCurrencyForBoard } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/useAuth';
import type { PaymentRegion } from '@/lib/payments';

type BillingCycle = 'monthly' | 'annual';

export function SubscriptionPlans({ currentTier }: { currentTier: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const currency = getCurrencyForBoard(user?.board);
  const symbol = CURRENCY_SYMBOLS[currency];

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment receive ho gayi. Plan sync ho raha hai.');
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout cancel ho gaya.');
    }
  }, [searchParams]);

  const handleUpgrade = async (tier: string, region: PaymentRegion) => {
    if (tier === currentTier) return;
    const loadingKey = `${tier}:${region}:${billingCycle}`;
    setLoading(loadingKey);
    try {
      const res = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, region, billingCycle }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else toast.error(json.error || 'Checkout start nahi ho saka');
    } catch {
      toast.error('Kuch ghalat ho gaya');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="inline-flex items-center gap-3 rounded-full border border-border bg-background/70 p-1.5">
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
        {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => {
          const isCurrent = currentTier === key;
          const isFree = key === 'FREE';
          const pricing = plan.price[currency];
          const displayPrice =
            billingCycle === 'annual' && !isFree ? pricing.annual : pricing.monthly;
          const priceSuffix = billingCycle === 'annual' && !isFree ? '/yr' : '/mo';
          const monthlyEquivalent =
            billingCycle === 'annual' && !isFree ? Math.round(pricing.annual / 12) : null;
          const PlanIcon = key === 'FREE' ? Sparkles : key === 'PRO' ? Rocket : Crown;
          const iconBg =
            key === 'FREE'
              ? 'from-slate-500 to-gray-600'
              : key === 'PRO'
                ? 'from-violet-500 to-indigo-600'
                : 'from-amber-500 to-orange-600';

          return (
            <Card
              key={key}
              className={cn(isCurrent && 'border-violet-500/50 shadow-lg shadow-violet-500/10')}
            >
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
                        'rounded-full border-0 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white',
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
                    {symbol}
                    {displayPrice}
                    <span className="text-sm font-normal text-muted-foreground">{priceSuffix}</span>
                  </p>
                  {monthlyEquivalent !== null && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {symbol}
                      {monthlyEquivalent}/mo effective
                    </p>
                  )}
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
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant="gradient"
                      className="w-full"
                      loading={loading === `${key}:INTERNATIONAL:${billingCycle}`}
                      onClick={() => handleUpgrade(key, 'INTERNATIONAL')}
                    >
                      <Globe2 className="h-4 w-4" />
                      International Payment
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      loading={loading === `${key}:PAKISTAN:${billingCycle}`}
                      onClick={() => handleUpgrade(key, 'PAKISTAN')}
                    >
                      <Landmark className="h-4 w-4" />
                      Pakistan Payment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
