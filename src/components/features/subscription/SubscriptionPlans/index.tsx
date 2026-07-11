'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, Crown, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CURRENCY_SYMBOLS } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from '@/lib/platform-settings/shared';

type BillingCycle = 'monthly' | 'annual';
type PaymentAvailability = { paddleConfigured: boolean; payproConfigured: boolean; automatedAvailable: boolean };
type TierKey = 'FREE' | 'PRO' | 'ELITE';
const PLAN_KEYS: TierKey[] = ['FREE', 'PRO', 'ELITE'];

export function SubscriptionPlans({
  currentTier,
  paymentAvailability: _paymentAvailability,
  settings = DEFAULT_PLATFORM_SETTINGS,
}: {
  currentTier: string;
  paymentAvailability: PaymentAvailability;
  settings?: PlatformSettings;
}) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const searchParams = useSearchParams();
  const symbol = CURRENCY_SYMBOLS.PKR;
  const free = settings.subscriptionPlans.FREE;
  const pro = settings.subscriptionPlans.PRO;
  const elite = settings.subscriptionPlans.ELITE;

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment receive ho gayi. Plan sync ho raha hai.');
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout cancel ho gaya.');
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-4 text-sm">
        <p className="font-semibold">Upgrade se AI limits unlock hoti hain</p>
        <p className="mt-2 text-muted-foreground">
          Free: side chat {free.limits.aiSideChatDaily}/day, AI tools/testing {free.limits.aiToolDaily}/day. Pro: har AI tool {pro.limits.aiToolDaily}/day. Elite: har AI tool {elite.limits.aiToolDaily}/day + Live Voice.
        </p>
      </div>

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
        {PLAN_KEYS.filter((key) => settings.subscriptionPlans[key].enabled).map((key) => {
          const plan = settings.subscriptionPlans[key];
          const isCurrent = currentTier === key;
          const isFree = key === 'FREE';
          const pricing = plan.price.PKR;
          const displayPrice = billingCycle === 'annual' && !isFree ? pricing.annual : pricing.monthly;
          const priceSuffix = billingCycle === 'annual' && !isFree ? '/year' : '/mo';
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
                    {displayPrice.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground">{priceSuffix}</span>
                  </p>
                  {monthlyEquivalent !== null && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {symbol}
                      {monthlyEquivalent.toLocaleString()}/mo effective
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
                  <Button asChild className="w-full" variant="gradient">
                    <Link href={`/subscription/${key.toLowerCase()}?billing=${billingCycle}`}>
                      {key === 'PRO' ? 'Go to Pro' : 'Go Elite'}
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
