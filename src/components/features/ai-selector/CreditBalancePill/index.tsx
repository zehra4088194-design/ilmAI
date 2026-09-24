'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type CreditStatus = {
  remaining: number;
  limit: number;
  reset: number;
  tier: string;
  period: 'week' | 'month';
  daily: { remaining: number; limit: number; reset: number } | null;
};

export function CreditBalancePill({ className }: { className?: string }) {
  const [status, setStatus] = useState<CreditStatus | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/credits', { cache: 'no-store' });
        if (!response.ok) return;
        const json = await response.json();
        if (active) setStatus(json.data || null);
      } catch {
        // The balance is supplementary; AI endpoints still enforce the quota.
      }
    };
    void load();
    const timer = window.setInterval(load, 30000);
    const refresh = () => void load();
    window.addEventListener('ilm-ai-credits-changed', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('ilm-ai-credits-changed', refresh);
    };
  }, []);

  if (!status) return null;
  const periodLabel = status.period === 'week' ? 'weekly' : 'monthly';
  const title = status.daily
    ? `${status.remaining.toLocaleString()} ${periodLabel} credits left; ${status.daily.remaining.toLocaleString()} of ${status.daily.limit.toLocaleString()} available today`
    : `${status.remaining.toLocaleString()} of ${status.limit.toLocaleString()} ${periodLabel} credits left`;

  return (
    <Link
      href="/subscription#credits"
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600 transition hover:bg-amber-500/20 sm:px-2.5',
        className
      )}
    >
      <Coins className="h-3.5 w-3.5" />
      <span>{status.remaining.toLocaleString()}</span>
      <span className="hidden lg:inline">credits</span>
      {status.daily && (
        <span className="hidden border-l border-amber-500/30 pl-1.5 xl:inline">
          {status.daily.remaining.toLocaleString()} today
        </span>
      )}
    </Link>
  );
}
