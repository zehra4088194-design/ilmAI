'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { readCookieConsent, type CookieConsentPreferences } from '@/lib/utils/cookieConsent';
import type { AdPlacement } from '@/lib/ads/constants';

type Banner = { id: string; title: string; imageUrl: string; clickHref: string };

interface HouseAdBannerProps {
  slot: AdPlacement;
  className?: string;
  /** e.g. a subject name like "Chemistry" on a subject-scoped page — prefers matching banners,
   * never restricts to only them (see selectActiveBanners' fallback in lib/ads/queries.ts). */
  categoryContext?: string | null;
}

const ROTATE_MS = 3000;

/**
 * Self-served promotional banner carousel for ilmai.store — the AdSense replacement. Fetches every
 * active, weighted banner for `slot` (scoped to the viewer's role and FREE/PRO/ELITE tier
 * server-side — PRO/ELITE always get an empty list), auto-advances every 3s with a slide
 * transition, and exposes manual prev/next controls. Each banner links through
 * /api/ads/click/[id] so a click_id exists before the ilmai.store redirect, and fires a
 * fire-and-forget impression bump the first time it's shown.
 */
export function HouseAdBanner({ slot, className = '', categoryContext }: HouseAdBannerProps) {
  const [banners, setBanners] = useState<Banner[] | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [preferences, setPreferences] = useState<CookieConsentPreferences | null>(null);
  const trackedImpressions = useRef<Set<string>>(new Set());

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
      setBanners(undefined);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({ slot });
    if (categoryContext) params.set('category', categoryContext);
    fetch(`/api/ads/banners?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : { banners: [] }))
      .then((json) => {
        if (cancelled) return;
        setBanners(Array.isArray(json.banners) ? json.banners : []);
        setIndex(0);
      })
      .catch(() => {
        if (!cancelled) setBanners([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slot, categoryContext, preferences?.marketing]);

  const current = banners && banners.length ? banners[index % banners.length] : null;

  useEffect(() => {
    if (!current || trackedImpressions.current.has(current.id)) return;
    trackedImpressions.current.add(current.id);
    // Not awaited — never blocks the banner from rendering.
    fetch('/api/ads/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bannerId: current.id }),
      keepalive: true,
    }).catch(() => {});
  }, [current]);

  // Auto-advance every 3s. Re-running on every index change (whether from this timer or a manual
  // prev/next click) naturally restarts the 3s countdown after any interaction.
  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const timer = setTimeout(() => {
      setDirection(1);
      setIndex((value) => (value + 1) % banners.length);
    }, ROTATE_MS);
    return () => clearTimeout(timer);
  }, [banners, index]);

  if (!banners || !current) return null;

  const goNext = () => {
    setDirection(1);
    setIndex((value) => (value + 1) % banners.length);
  };
  const goPrev = () => {
    setDirection(-1);
    setIndex((value) => (value - 1 + banners.length) % banners.length);
  };

  return (
    <div className={`overflow-hidden ${className}`}>
      <p className="text-[10px] text-muted-foreground text-center mb-1 select-none">Promoted</p>
      <div className="bg-muted/30 relative flex items-center justify-center overflow-hidden rounded-lg">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.a
            key={current.id}
            href={current.clickHref}
            aria-label={current.title}
            className="block w-full"
            custom={direction}
            initial={{ x: direction > 0 ? '30%' : '-30%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? '-30%' : '30%', opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeInOut' }}
          >
            {/* Capped height so a tall/square admin-uploaded image (a school logo, a portrait
                poster) can never balloon into a huge block — object-contain (not cover) keeps the
                whole image visible either way, just letterboxed instead of stretched or cropped. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.imageUrl} alt={current.title} className="max-h-28 w-full object-contain sm:max-h-36" />
          </motion.a>
        </AnimatePresence>
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous ad"
              className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white transition hover:bg-black/60"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next ad"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white transition hover:bg-black/60"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
