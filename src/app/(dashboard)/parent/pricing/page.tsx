import Link from 'next/link';
import { Check, Crown, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { convertUsdToPkr } from '@/lib/platform-settings/shared';
import { TRANSACTION_FEE_USD } from '@/lib/constants';

export const metadata = { title: 'Parent Plans | ilm AI' };

/**
 * A parent account's OWN plan — separate from what plan any of their linked children are on. See
 * ParentPlanSettings' doc comment in lib/platform-settings/shared.ts for why this is a distinct
 * system (profiles.subscription_tier on the PARENT's own row, gated independently).
 */
export default async function ParentPricingPage() {
  const settings = await getPlatformSettings();
  const { parentPlans } = settings;
  const feePkr = convertUsdToPkr(TRANSACTION_FEE_USD, settings);
  const paidPkr = convertUsdToPkr(parentPlans.paid.priceUsdMonthly, settings);
  const elitePkr = convertUsdToPkr(parentPlans.elite.priceUsdMonthly, settings);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">Parent Plans</h1>
        <p className="text-muted-foreground mt-2">
          Link your children&apos;s accounts and follow their study progress from one dashboard.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">Free</h3>
            <p className="text-3xl font-bold">
              $0<span className="text-muted-foreground text-sm font-normal">/mo</span>
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Link up to {parentPlans.freeChildrenMax} {parentPlans.freeChildrenMax === 1 ? 'child' : 'children'}
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Quiz count and score overview
              </li>
            </ul>
            <Button variant="outline" className="w-full" disabled>
              Included with every parent account
            </Button>
          </CardContent>
        </Card>

        <Card className="border-violet-500/50 shadow-lg shadow-violet-500/10">
          <CardContent className="space-y-4 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">Paid</h3>
            <div>
              <p className="text-3xl font-bold">
                ${parentPlans.paid.priceUsdMonthly.toFixed(2)}
                <span className="text-muted-foreground text-sm font-normal">/mo</span>
              </p>
              <p className="text-muted-foreground text-sm">≈ Rs. {paidPkr.toLocaleString()}/mo</p>
              <p className="text-muted-foreground text-xs">
                +${TRANSACTION_FEE_USD.toFixed(2)} transaction fee (≈ Rs. {feePkr.toLocaleString()})
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Link up to {parentPlans.paid.childrenMax} children
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Full analytics — study time trends, notes read, activity feed
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Everything in Free
              </li>
            </ul>
            <Button asChild variant="gradient" className="w-full">
              <Link href="/parent/pricing/paid">Checkout Paid</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold">Elite</h3>
              <Badge className="bg-amber-500 text-white">Unlimited children</Badge>
            </div>
            <div>
              <p className="text-3xl font-bold">
                ${parentPlans.elite.priceUsdMonthly.toFixed(2)}
                <span className="text-muted-foreground text-sm font-normal">/mo</span>
              </p>
              <p className="text-muted-foreground text-sm">≈ Rs. {elitePkr.toLocaleString()}/mo</p>
              <p className="text-muted-foreground text-xs">
                +${TRANSACTION_FEE_USD.toFixed(2)} transaction fee (≈ Rs. {feePkr.toLocaleString()})
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Link unlimited children
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Everything in Paid
              </li>
            </ul>
            <Button asChild variant="gradient" className="w-full">
              <Link href="/parent/pricing/elite">Checkout Elite</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
