'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, SkipForward } from 'lucide-react';
import { readCookieConsent, type CookieConsentPreferences } from '@/lib/utils/cookieConsent';
import type { AdPlacement } from '@/lib/ads/constants';

type Banner = { id: string; title: string; imageUrl: string; clickHref: string };

const TOTAL_ADS = 5;
const SKIP_UNLOCK_MS = 3000;
const AUTO_ADVANCE_MS = 15000;

/**
 * FREE-plan gate for the Teacher Test Studio: makes the teacher sit through TOTAL_ADS ads
 * (cycling through whatever the 'teacher_test_gate' placement has, repeating creatives if the
 * inventory has fewer than TOTAL_ADS) before `onComplete` fires and "Generate test" unlocks.
 * Each ad shows for up to AUTO_ADVANCE_MS; the Next/Skip button stays disabled for the first
 * SKIP_UNLOCK_MS so it can't be instantly clicked through. If no banners are configured for the
 * placement, the gate completes immediately rather than blocking the teacher forever.
 */
export function AdGateSequence({ slot, onComplete }: { slot: AdPlacement; onComplete: () => void }) {
  const [banners, setBanners] = useState<Banner[] | undefined>(undefined);
  const [step, setStep] = useState(0);
  const [skipReady, setSkipReady] = useState(false);
  const [skipCountdown, setSkipCountdown] = useState(SKIP_UNLOCK_MS / 1000);
  const [preferences, setPreferences] = useState<CookieConsentPreferences | null>(null);
  const trackedImpressions = useRef<Set<string>>(new Set());
  const completedRef = useRef(false);

  useEffect(() => {
    setPreferences(readCookieConsent());
    const handleConsentChange = (event: Event) => {
      setPreferences((event as CustomEvent<CookieConsentPreferences>).detail || readCookieConsent());
    };
    window.addEventListener('ilm-ai-cookie-consent-change', handleConsentChange);
    return () => window.removeEventListener('ilm-ai-cookie-consent-change', handleConsentChange);
  }, []);

  useEffect(() => {
    if (!preferences?.marketing) {
      // No marketing consent — nothing to show. Don't trap a FREE teacher behind a gate
      // whose content they've opted out of; let them straight through.
      setBanners([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/ads/banners?slot=${slot}`)
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
  }, [slot, preferences?.marketing]);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  const advance = () => {
    setStep((value) => {
      const next = value + 1;
      if (next >= TOTAL_ADS) {
        finish();
        return value;
      }
      return next;
    });
  };

  // No inventory at all — skip the gate outright.
  useEffect(() => {
    if (banners && banners.length === 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners]);

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

  // Per-step timers: Skip unlocks at 3s, auto-advance fires at 15s. Both reset on every step.
  useEffect(() => {
    if (!current) return;
    setSkipReady(false);
    setSkipCountdown(SKIP_UNLOCK_MS / 1000);
    const skipTimer = setTimeout(() => setSkipReady(true), SKIP_UNLOCK_MS);
    const autoTimer = setTimeout(() => advance(), AUTO_ADVANCE_MS);
    const tick = setInterval(() => setSkipCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => {
      clearTimeout(skipTimer);
      clearTimeout(autoTimer);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, step]);

  if (banners === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading ad...
      </div>
    );
  }

  if (!current) return null;

  const isLast = step === TOTAL_ADS - 1;

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Free plan: watch {TOTAL_ADS} quick ads to unlock this paper</p>
        <div className="flex items-center gap-1">
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

      <p className="text-[10px] text-muted-foreground text-center select-none">
        Ad {step + 1} of {TOTAL_ADS}
      </p>
      <div className="bg-muted/30 flex items-center justify-center overflow-hidden rounded-lg">
        <a href={current.clickHref} target="_blank" rel="noopener noreferrer" className="block w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.imageUrl} alt={current.title} className="max-h-28 w-full object-contain sm:max-h-36" />
        </a>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={advance}
          disabled={!skipReady}
          className="border-input bg-card hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SkipForward className="h-3.5 w-3.5" />
          {skipReady ? (isLast ? 'Finish' : 'Next ad') : `Wait ${skipCountdown}s`}
        </button>
      </div>
    </div>
  );
}

export function AdGateComplete() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm font-semibold text-emerald-600">
      <CheckCircle2 className="h-4 w-4" />
      Ads viewed — you can generate your test paper now.
    </div>
  );
}
