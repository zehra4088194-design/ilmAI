'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Copy, CreditCard, Crown, Landmark, Loader2, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CURRENCY_SYMBOLS, MANUAL_PAYMENT_OPTIONS, SUBSCRIPTION_PLANS } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

type BillingCycle = 'monthly' | 'annual';
type PaymentAvailability = { paddleConfigured: boolean; payproConfigured: boolean; automatedAvailable: boolean };

export function SubscriptionPlans({ currentTier, paymentAvailability }: { currentTier: string; paymentAvailability: PaymentAvailability }) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const symbol = CURRENCY_SYMBOLS.PKR;

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment receive ho gayi. Plan sync ho raha hai.');
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout cancel ho gaya.');
    }
  }, [searchParams]);

  const copyNumber = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Number copy ho gaya: ${value}`);
    } catch {
      toast.error('Number copy nahi ho saka');
    }
  };

  const startCheckout = async (tier: 'PRO' | 'ELITE', region: 'PAKISTAN' | 'INTERNATIONAL') => {
    setCheckoutLoading(`${tier}-${region}`);
    try {
      const res = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billingCycle, region }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        toast.error(json.error || 'Checkout start nahi ho saka. Manual payment use karein.');
        return;
      }
      window.location.href = json.url;
    } catch {
      toast.error('Checkout start nahi ho saka. Manual payment use karein.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/80 p-4 text-sm">
        <p className="font-semibold">Payment method currently available</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant={paymentAvailability.payproConfigured ? 'success' : 'secondary'}>PayPro / Pakistan {paymentAvailability.payproConfigured ? 'active' : 'manual fallback'}</Badge>
          <Badge variant={paymentAvailability.paddleConfigured ? 'success' : 'secondary'}>Paddle / Card {paymentAvailability.paddleConfigured ? 'active' : 'not configured'}</Badge>
          <Badge variant="outline">Easypaisa / JazzCash manual always available</Badge>
        </div>
        <p className="mt-3 text-muted-foreground">
          Automated checkout configured ho to button show hoga. Agar provider env missing ho, broken checkout hide rahega aur manual Easypaisa/JazzCash flow use hoga.
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
        {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => {
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
                  <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                    {paymentAvailability.payproConfigured && (
                      <Button className="w-full" variant="gradient" onClick={() => startCheckout(key as 'PRO' | 'ELITE', 'PAKISTAN')} disabled={checkoutLoading !== null}>
                        {checkoutLoading === `${key}-PAKISTAN` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        Pay online with PayPro
                      </Button>
                    )}
                    {paymentAvailability.paddleConfigured && (
                      <Button className="w-full" variant="outline" onClick={() => startCheckout(key as 'PRO' | 'ELITE', 'INTERNATIONAL')} disabled={checkoutLoading !== null}>
                        {checkoutLoading === `${key}-INTERNATIONAL` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        Pay by card with Paddle
                      </Button>
                    )}
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Landmark className="h-4 w-4 text-violet-400" />
                      Manual payment details
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {plan.name} {billingCycle === 'annual' ? 'Yearly' : 'Monthly'} ke liye{' '}
                      <span className="font-semibold text-foreground">
                        {symbol}
                        {displayPrice.toLocaleString()}
                      </span>{' '}
                      send karein.
                    </p>
                    <div className="space-y-2">
                      {MANUAL_PAYMENT_OPTIONS.map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => copyNumber(option.number)}
                          className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-left transition-colors hover:border-violet-500/40"
                        >
                          <div>
                            <p className="text-sm font-semibold">{option.label}</p>
                            <p className="text-xs text-muted-foreground">{option.number}</p>
                          </div>
                          <Copy className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] leading-5 text-muted-foreground">
                      Payment screenshot aur apna account email `zehra4088194@gmail.com` par bhej dein. Within 1 hour
                      your transaction will be verified.
                    </p>
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
