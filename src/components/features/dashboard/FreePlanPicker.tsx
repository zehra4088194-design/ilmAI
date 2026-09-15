'use client';

import Link from 'next/link';
import { Crown, Rocket, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { convertUsdToPkr, formatPkrAmount } from '@/lib/platform-settings/shared';

type Tier = 'FREE' | 'PRO' | 'ELITE';

export function FreePlanPicker() {
  const settings = usePlatformSettings();
  const [selected, setSelected] = React.useState<Tier>('PRO');
  const tiers: Tier[] = ['FREE', 'PRO', 'ELITE'];
  const selectedPlan = settings.subscriptionPlans[selected];
  const selectedUsd = selectedPlan.price.USD.monthly;
  const selectedPkr = convertUsdToPkr(selectedUsd, settings);
  const icons = { FREE: Sparkles, PRO: Rocket, ELITE: Crown };

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-600/15 via-indigo-500/10 to-cyan-500/10 p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-violet-300">Choose your plan</p>
          <p className="text-muted-foreground text-sm">Pick any plan below — no single plan is forced on a new user.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tiers.map((tier) => {
            const Icon = icons[tier];
            const active = selected === tier;
            return (
              <button key={tier} type="button" onClick={() => setSelected(tier)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${active ? 'border-violet-400 bg-violet-500/15' : 'border-border bg-background/50'}`}>
                <Icon className="h-4 w-4" />
                <span className="text-xs font-semibold">{settings.subscriptionPlans[tier].name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-xl border bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge variant="secondary">{selectedPlan.name}</Badge>
          <p className="mt-1 text-2xl font-black">${selectedUsd.toFixed(2)}<span className="text-muted-foreground text-sm font-normal">/mo</span></p>
          <p className="text-muted-foreground text-sm">= Rs {formatPkrAmount(selectedPkr)}</p>
        </div>
        {selected === 'FREE' ? (
          <Button variant="outline" disabled>Free Plan</Button>
        ) : (
          <Button asChild variant="gradient"><Link href={`/subscription/${selected.toLowerCase()}`}>Choose {selectedPlan.name}</Link></Button>
        )}
      </div>
    </div>
  );
}

import * as React from 'react';
