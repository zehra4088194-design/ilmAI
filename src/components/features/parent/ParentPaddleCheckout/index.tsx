'use client';

import { useMemo, useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

export function ParentPaddleCheckout({
  tier,
  monthlyPriceUsd,
}: {
  tier: 'paid' | 'elite';
  monthlyPriceUsd: number;
}) {
  const [cycle, setCycle] = useState<'monthly' | 'annual' | 'one_time'>('monthly');
  const [loading, setLoading] = useState(false);

  const label = tier === 'elite' ? 'Elite' : 'Paid';
  const annualPrice = useMemo(() => Math.round(monthlyPriceUsd * 12 * 0.8 * 100) / 100, [monthlyPriceUsd]);
  const amount = cycle === 'annual' ? annualPrice : monthlyPriceUsd;

  const startCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tier === 'elite' ? 'ELITE' : 'PRO',
          billingCycle: cycle,
          planFamily: 'parent',
          provider: 'paddle',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'Paddle checkout could not be started.');
      window.location.href = json.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Checkout could not be started.');
      setLoading(false);
    }
  };

  return (
    <Card className="border-violet-500/30 bg-violet-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4 text-violet-400" />
          Pay securely with Paddle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {label} Parent Plan — choose recurring monthly, annual, or a one-time 30-day pass.
        </p>
        <div className="grid grid-cols-3 gap-2 rounded-xl border bg-background/40 p-1">
          {([
            ['monthly', 'Monthly'],
            ['annual', 'Annual'],
            ['one_time', 'One-time'],
          ] as const).map(([value, text]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCycle(value)}
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm',
                cycle === value ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {text}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-2xl font-bold">${amount.toFixed(2)}</p>
            <p className="text-muted-foreground text-xs">
              {cycle === 'monthly' ? 'billed every month' : cycle === 'annual' ? 'billed once per year' : 'one payment, 30-day access'}
            </p>
          </div>
          <Button type="button" variant="gradient" onClick={startCheckout} disabled={loading} className="sm:min-w-48">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {loading ? 'Opening checkout…' : 'Continue with Card'}
          </Button>
        </div>
        <p className="text-muted-foreground text-[11px]">
          Your plan is activated automatically after Paddle confirms the payment. Subscription and one-time access
          are handled by the existing Paddle webhook.
        </p>
      </CardContent>
    </Card>
  );
}
