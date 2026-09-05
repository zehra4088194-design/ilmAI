'use client';

import Link from 'next/link';
import { ArrowLeft, Copy, Crown, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MANUAL_PAYMENT_OPTIONS, TRANSACTION_FEE_USD } from '@/lib/constants';

/**
 * Manual JazzCash checkout for a parent's OWN plan — mirrors ManualUpgradePage's pattern (QR,
 * transaction fee, WhatsApp + email screenshot) but for parentPlans pricing, not subscriptionPlans.
 * No self-serve activation: same as the consumer wallet flow, an admin manually verifies the
 * screenshot and flips this parent's profiles.subscription_tier to PRO ('paid') or ELITE
 * ('elite') — see ParentPlanSettings' doc comment for why that column is reused here.
 */
export function ParentPlanCheckout({
  tier,
  priceUsd,
  pkrPrice,
  feePkr,
  totalPkr,
  childrenMax,
  walletQrDataUrl,
}: {
  tier: 'paid' | 'elite';
  priceUsd: number;
  pkrPrice: number;
  feePkr: number;
  totalPkr: number;
  childrenMax: number | null;
  walletQrDataUrl: string | null;
}) {
  const Icon = tier === 'elite' ? Crown : Users;
  const highlight = tier === 'elite' ? 'from-amber-500 to-orange-600' : 'from-violet-500 to-indigo-600';

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success('Copied');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/parent/pricing">
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
              <h1 className="text-3xl font-bold">{tier === 'elite' ? 'Elite' : 'Paid'} Parent Plan</h1>
              <p className="mt-1 text-white/85">
                ${priceUsd.toFixed(2)}/mo
                <span className="ml-2 text-sm text-white/70">
                  +${TRANSACTION_FEE_USD.toFixed(2)} transaction fee
                </span>
              </p>
              <p className="mt-1 text-sm text-white/85">
                {childrenMax === null ? 'Unlimited children' : `Up to ${childrenMax} children`}
              </p>
            </div>
          </div>
        </div>

        <CardContent className="space-y-5 p-6">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <h2 className="text-lg font-bold">JazzCash</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Send exactly Rs. {totalPkr.toLocaleString()} (Rs. {pkrPrice.toLocaleString()} plan price + Rs.{' '}
              {feePkr.toLocaleString()} transaction fee), then send the transaction screenshot and your account email
              to support. Your parent plan is activated by an admin after verification.
            </p>
            <div className="mt-4 space-y-3">
              {MANUAL_PAYMENT_OPTIONS.map((option) => (
                <div
                  key={option.label}
                  className="bg-background flex flex-col items-center gap-4 rounded-xl border p-4 text-center sm:flex-row sm:text-left"
                >
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
                    <p className="text-lg font-bold">Rs. {totalPkr.toLocaleString()}</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
