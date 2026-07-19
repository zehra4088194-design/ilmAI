'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type CreditStatus = { remaining: number; limit: number; reset: number; tier: string };

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
  return (
    <Link
      href="/subscription#credits"
      title="AI credits remaining"
      className={cn('inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 transition hover:bg-amber-500/20', className)}
    >
      <Coins className="h-3.5 w-3.5" />
      <span>{status.remaining.toLocaleString()} credits</span>
    </Link>
  );
}
