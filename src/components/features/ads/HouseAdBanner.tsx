'use client';
import { useEffect, useRef, useState } from 'react';
import { readCookieConsent, type CookieConsentPreferences } from '@/lib/utils/cookieConsent';
import type { AdPlacement } from '@/lib/ads/constants';

type Banner = { id: string; title: string; imageUrl: string; clickHref: string };

interface HouseAdBannerProps {
  slot: AdPlacement;
  className?: string;
}

/**
 * Self-served promotional banner for ilmai.store — the AdSense replacement. Fetches one active,
 * weighted-random banner for `slot` (scoped to the viewer's role server-side), links it through
 * /api/ads/click/[id] so a click_id exists before the ilmai.store redirect, and fires a
 * fire-and-forget impression bump once it renders.
 */
export function HouseAdBanner({ slot, className = '' }: HouseAdBannerProps) {
  const [banner, setBanner] = useState<Banner | null | undefined>(undefined);
  const [preferences, setPreferences] = useState<CookieConsentPreferences | null>(null);
  const trackedImpressionFor = useRef<string | null>(null);

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
      setBanner(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/ads/banners?slot=${encodeURIComponent(slot)}`)
      .then((response) => (response.ok ? response.json() : { banner: null }))
      .then((json) => {
        if (!cancelled) setBanner(json.banner || null);
      })
      .catch(() => {
        if (!cancelled) setBanner(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slot, preferences?.marketing]);

  useEffect(() => {
    if (!banner || trackedImpressionFor.current === banner.id) return;
    trackedImpressionFor.current = banner.id;
    // Not awaited — never blocks the banner from rendering.
    fetch('/api/ads/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bannerId: banner.id }),
      keepalive: true,
    }).catch(() => {});
  }, [banner]);

  if (!banner) return null;

  return (
    <div className={`overflow-hidden ${className}`}>
      <p className="text-[10px] text-muted-foreground text-center mb-1 select-none">Promoted</p>
      <a
        href={banner.clickHref}
        className="bg-muted/30 flex items-center justify-center overflow-hidden rounded-lg"
        aria-label={banner.title}
      >
        {/* Capped height so a tall/square admin-uploaded image (a school logo, a portrait poster)
            can never balloon into a huge block — it was rendered at `w-full` with no height limit
            at all, so its NATURAL aspect ratio at full container width decided the height, and a
            near-square image ended up hundreds of pixels tall. object-contain (not cover) keeps
            the whole image visible either way, just letterboxed instead of stretched or cropped. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner.imageUrl} alt={banner.title} className="max-h-28 w-full object-contain sm:max-h-36" />
      </a>
    </div>
  );
}
