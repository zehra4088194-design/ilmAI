'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import type { AdPlacement } from '@/lib/ads/constants';

type Banner = { id: string; title: string; imageUrl: string; clickHref: string };

const TOTAL_ADS = 5;
const AD_DURATION_MS = 3000;

/**
 * FREE-plan gate for Teacher Test Studio.
 *
 * The teacher sees five real ilmAI.store product creatives, one at a time, for exactly 3 seconds
 * each. That makes the complete gate 15 seconds. The gate never silently unlocks when the store
 * feed is empty: the teacher gets a retry action instead.
 *
 * The server endpoint may still receive the placement name "teacher_test_gate" from older callers;
 * for this gate we intentionally resolve that placement to the live store_products feed so newly
 * published products are automatically eligible without a second ad-management workflow.
 */
export function AdGateSequence({ slot, onComplete }: { slot: AdPlacement; onComplete: () => void }) {
  const [banners, setBanners] = useState<Banner[] | undefined>(undefined);
  const [step, setStep] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(3);
  const trackedImpressions = useRef<Set<string>>(new Set());
  const completedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setBanners(undefined);
    setStep(0);
    setRemainingSeconds(3);

    // Teacher free-test ads are always first-party store products.
    const effectiveSlot = slot === 'teacher_test_gate' ? 'store_products' : slot;
    fetch(`/api/ads/banners?slot=${effectiveSlot}&limit=${TOTAL_ADS}`)
      .then((response) => (response.ok ? response.json() : { banners: [] }))
      .then((json) => {
        if (!cancelled) setBanners(Array.isArray(json.banners) ? json.banners : []);
      })
      .catch(() => {
        if (!cancelled) setBanners([]);
      });

    return () => {
      cancelled = true;
    };
  }, [slot, retryKey]);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  const current = banners && banners.length ? banners[step % banners.length] : null;

  useEffect(() => {
    if (!current || trackedImpressions.current.has(`${step}-${current.id}`)) return;
    trackedImpressions.current.add(`${step}-${current.id}`);
    fetch('/api/ads/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bannerId: current.id }),
      keepalive: true,
    }).catch(() => {});
  }, [current, step]);

  // Exactly 3 seconds per creative; there is deliberately no skip button.
  useEffect(() => {
    if (!current) return;
    setRemainingSeconds(3);
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setRemainingSeconds(Math.max(0, Math.ceil((AD_DURATION_MS - elapsed) / 1000)));
    }, 100);
    const timer = window.setTimeout(() => {
      setStep((value) => {
        const next = value + 1;
        if (next >= TOTAL_ADS) {
          finish();
          return value;
        }
        return next;
      });
    }, AD_DURATION_MS);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, step]);

  if (banners === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading store ad...
      </div>
    );
  }

  if (!current) {
    return (
      <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-5 text-center">
        <p className="text-sm font-semibold">Store ads are temporarily unavailable.</p>
        <p className="text-xs text-muted-foreground">We need five store ads before a free test can be generated. Nothing is unlocked early.</p>
        <button
          type="button"
          onClick={() => setRetryKey((value) => value + 1)}
          className="mx-auto inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry store ads
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Free plan: watch 5 store ads to unlock this paper</p>
        <div className="flex items-center gap-1" aria-label={`Ad ${step + 1} of ${TOTAL_ADS}`}>
          {Array.from({ length: TOTAL_ADS }).map((_, index) => (
            <span
              key={index}
              className={`h-1.5 w-5 rounded-full transition-colors ${
                index < step ? 'bg-emerald-500' : index === step ? 'bg-amber-400' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground select-none">
        Store ad {step + 1} of {TOTAL_ADS} · next ad in {remainingSeconds}s
      </p>
      <div className="bg-muted/30 flex min-h-32 items-center justify-center overflow-hidden rounded-lg sm:min-h-40">
        <a href={current.clickHref} target="_blank" rel="noopener noreferrer" className="block w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.imageUrl} alt={current.title} className="max-h-36 w-full object-contain sm:max-h-44" />
        </a>
      </div>
    </div>
  );
}

export function AdGateComplete() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm font-semibold text-emerald-600">
      <CheckCircle2 className="h-4 w-4" />
      5 store ads viewed — you can generate your test paper now.
    </div>
  );
}
