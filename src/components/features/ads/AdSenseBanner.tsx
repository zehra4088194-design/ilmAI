'use client';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';

interface AdSenseBannerProps {
  slot: 'sidebar' | 'inline';
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

/**
 * Shows Google AdSense ads to FREE tier users only.
 * Pro/Elite users see nothing — no layout shift, no wasted space.
 */
export function AdSenseBanner({ slot, className = '' }: AdSenseBannerProps) {
  const { user } = useAuth();
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = slot === 'sidebar'
    ? process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR
    : process.env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE;

  const isPaid = user && user.subscriptionTier !== 'FREE';
  const shouldShow = !isPaid && !!clientId && !!slotId;

  useEffect(() => {
    if (!shouldShow || pushed.current) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushed.current = true;
    } catch {}
  }, [shouldShow]);

  if (!shouldShow) return null;

  return (
    <div ref={adRef} className={`overflow-hidden ${className}`}>
      <p className="text-[10px] text-muted-foreground text-center mb-1 select-none">Advertisement</p>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format={slot === 'sidebar' ? 'auto' : 'fluid'}
        data-full-width-responsive="true"
      />
    </div>
  );
}