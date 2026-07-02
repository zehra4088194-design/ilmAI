'use client';
import { useState } from 'react';
import { Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

export function SubscriptionPlans({ currentTier }: { currentTier: string }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (tier: string) => {
    if (tier === currentTier) return;
    setLoading(tier);
    try {
      const res = await fetch('/api/payments/create-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier }) });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else toast.error(json.error || 'Checkout start nahi ho saka');
    } catch { toast.error('Kuch ghalat ho gaya'); }
    finally { setLoading(null); }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => {
        const isCurrent = currentTier === key;
        return (
          <Card key={key} className={cn(isCurrent && 'border-violet-500/50 shadow-lg shadow-violet-500/10')}>
            <CardContent className="p-6">
              {isCurrent && <Badge variant="default" className="bg-violet-600 mb-3">Current Plan</Badge>}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-3xl font-bold mb-4">Rs.{'priceMonthly' in plan ? plan.priceMonthly : 0}<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => <li key={i} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-green-500 shrink-0" />{f}</li>)}
              </ul>
              <Button variant={isCurrent ? 'outline' : 'gradient'} className="w-full" disabled={isCurrent} loading={loading === key} onClick={() => handleUpgrade(key)}>
                {isCurrent ? 'Current Plan' : <><Zap className="w-4 h-4" />Upgrade</>}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
