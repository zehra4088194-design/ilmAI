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
  // The box used to appear the instant a banner was picked, with its <img> still fetching — a
  // blank flash before the picture popped in. Every banner in the list is preloaded as soon as it
  // arrives (not just the current one) so rotating to the next banner never re-triggers that same
  // flash — by the time its turn comes around it's already sitting in the browser's cache.
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());

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
        setLoadedIds(new Set());
        setIndex(0);
      })
      .catch(() => {
        if (!cancelled) setBanners([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slot, categoryContext, preferences?.marketing]);

  // Preload every banner off-DOM as soon as the list arrives — not just the current one — so
  // rotating to the next banner every 3s never re-triggers the same load flash; by the time its
  // turn comes around it's already sitting in the browser's cache. Falls through to "loaded" on
  // error too, so one broken image can't stall the whole carousel on that slide forever.
  useEffect(() => {
    if (!banners?.length) return;
    let cancelled = false;
    for (const banner of banners) {
      const preload = new window.Image();
      preload.onload = () => { if (!cancelled) setLoadedIds((prev) => new Set(prev).add(banner.id)); };
      preload.onerror = () => { if (!cancelled) setLoadedIds((prev) => new Set(prev).add(banner.id)); };
      preload.src = banner.imageUrl;
    }
    return () => {
      cancelled = true;
    };
  }, [banners]);

  const current = banners && banners.length ? banners[index % banners.length] : null;
  const ready = current != null && loadedIds.has(current.id);

  useEffect(() => {
    if (!current || !ready || trackedImpressions.current.has(current.id)) return;
    trackedImpressions.current.add(current.id);
    // Not awaited — never blocks the banner from rendering.
    fetch('/api/ads/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bannerId: current.id }),
      keepalive: true,
    }).catch(() => {});
  }, [current, ready]);

  // Auto-advance every 3s once the current picture has actually finished loading — starting the
  // countdown before then could rotate away from a banner nobody ever got to see.
  useEffect(() => {
    if (!banners || banners.length <= 1 || !ready) return;
    const timer = setTimeout(() => {
      setDirection(1);
      setIndex((value) => (value + 1) % banners.length);
    }, ROTATE_MS);
    return () => clearTimeout(timer);
  }, [banners, index, ready]);

  // Nothing renders — not even the "Promoted" box — until the picture has actually finished
  // loading. It used to pop the box in first with a still-loading <img> behind it; now the whole
  // thing appears at once, already fully loaded (the preload above means this paints from cache).
  if (!banners || !current || !ready) return null;

  const goNext = () => {
    setDirection(1);
    setIndex((value) => (value + 1) % banners.length);
  };
  const goPrev = () => {
    setDirection(-1);
    setIndex((value) => (value - 1 + banners.length) % banners.length);
  };

  return (
    // Fixed square "box" instead of stretching full-width — a portrait/product-shot creative
    // (most admin-uploaded ads) used to sit tiny and left-aligned inside a wide, mostly-empty
    // strip once object-contain letterboxed it against a full-width, short container. A capped,
    // centered, aspect-locked box looks intentional (like a product card) no matter what shape
    // the uploaded image actually is — kept deliberately modest (not full-width, not the biggest
    // thing on the page) since this shares the page with real content, not an ad-first layout.
    <div className={`mx-auto w-full max-w-[160px] overflow-hidden ${className}`}>
      <p className="text-[10px] text-muted-foreground text-center mb-1 select-none">Promoted</p>
      <div className="bg-muted/30 relative aspect-square w-full overflow-hidden rounded-lg">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.a
            key={current.id}
            href={current.clickHref}
            aria-label={current.title}
            className="absolute inset-0 block"
            custom={direction}
            initial={{ x: direction > 0 ? '30%' : '-30%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? '-30%' : '30%', opacity: 0 }}
            transition={{ duration: 0.32, ease: 'easeInOut' }}
          >
            {/* object-contain (not cover) keeps the whole image visible either way, just
                letterboxed instead of stretched or cropped — but now within a fixed square box
                instead of an ambiguous full-width one, so the letterboxing itself looks tidy. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.imageUrl} alt={current.title} className="h-full w-full object-contain" />
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
      {/* The box used to be just a bare picture with nothing to say what it even was — a short
          caption under it names the product so the ad reads as an actual listing, not a mystery
          image. */}
      <p className="text-foreground/80 mt-1.5 line-clamp-1 text-center text-[11px] font-medium">{current.title}</p>
    </div>
  );
}
