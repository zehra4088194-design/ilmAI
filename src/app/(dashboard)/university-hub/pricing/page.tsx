import Link from 'next/link';
import { Check, Crown, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { convertUsdToPkr } from '@/lib/platform-settings/shared';
import { TRANSACTION_FEE_USD } from '@/lib/constants';

export const metadata = { title: 'University Pricing | ilm AI' };

/**
 * University student pricing page. Offers tiered AI credit packages for university students
 * to access essay writers, research helpers, and other university-specific AI tools.
 */
export default async function UniversityPricingPage() {
  const settings = await getPlatformSettings();
  const { universityPlans } = settings;
  const feePkr = convertUsdToPkr(TRANSACTION_FEE_USD, settings);
  const paidPkr = convertUsdToPkr(universityPlans.paid.priceUsdMonthly, settings);
  const elitePkr = convertUsdToPkr(universityPlans.elite.priceUsdMonthly, settings);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">University Plans</h1>
        <p className="text-muted-foreground mt-2">
          Access advanced AI tools for essays, research, assignments, and presentations.
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
                {universityPlans.free.aiCreditsMonthly} AI credits/month
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Essay Writer (limited)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Assignment Helper (limited)
              </li>
            </ul>
            <Button variant="outline" className="w-full" disabled>
              Included with account
            </Button>
          </CardContent>
        </Card>

        <Card className="border-violet-500/50 shadow-lg shadow-violet-500/10">
          <CardContent className="space-y-4 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">Paid</h3>
            <div>
              <p className="text-3xl font-bold">
                ${universityPlans.paid.priceUsdMonthly.toFixed(2)}
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
                {universityPlans.paid.aiCreditsMonthly} AI credits/month
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Essay Writer (unlimited)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Assignment Helper (unlimited)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Research Helper
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Presentation Builder
              </li>
            </ul>
            <Button asChild className="w-full bg-violet-600 hover:bg-violet-700">
              <Link href="/subscription?tier=pro">Upgrade to Paid</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-amber-500/50 shadow-lg shadow-amber-500/10">
          <CardContent className="space-y-4 p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold">Elite</h3>
            <div>
              <p className="text-3xl font-bold">
                ${universityPlans.elite.priceUsdMonthly.toFixed(2)}
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
                {universityPlans.elite.aiCreditsMonthly} AI credits/month
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                All Paid features
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Viva Practice (unlimited)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                Citation Generator
              </li>
            </ul>
            <Button asChild className="w-full bg-amber-500 hover:bg-amber-600">
              <Link href="/subscription?tier=elite">Upgrade to Elite</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:from-blue-950/20 dark:to-indigo-950/20">
        <p className="text-sm text-muted-foreground">
          All plans include access to university-specific resources, study materials, and the complete University Hub.
          Upgrade or downgrade your plan anytime.
        </p>
      </div>
    </div>
  );
}
