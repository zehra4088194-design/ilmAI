'use client';

import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * In-app "you're offline" message for surfaces that genuinely require a live
 * connection (AI generation, live quiz sessions, vision/OCR, voice, payments
 * — see src/lib/offline/online-only.ts). Reuses public/offline.html's visual
 * language (dark card, orange accent, bilingual copy) as a React component
 * so it can sit inline within an otherwise-loaded page shell, instead of a
 * full-page navigation fallback.
 */
export function OfflineNotice({
  feature,
  description,
  className = '',
}: {
  feature: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-64 flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#090d19] p-8 text-center text-slate-100 ${className}`}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-slate-900">
        <WifiOff className="h-7 w-7" />
      </span>
      <h3 className="mt-5 text-xl font-bold">{feature} ko internet chahiye</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-300">
        {description || `Connection ka intezar hai. ${feature} live internet ke bina kaam nahi karta.`} Reconnect
        karke dobara try karo.
      </p>
      <Button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 rounded-full bg-orange-400 font-bold text-slate-900 hover:bg-orange-300"
      >
        Dobara try karo
      </Button>
    </div>
  );
}
