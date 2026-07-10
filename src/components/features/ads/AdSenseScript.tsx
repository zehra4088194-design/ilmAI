'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { readCookieConsent, type CookieConsentPreferences } from '@/lib/utils/cookieConsent';

export function AdSenseScript() {
  const [preferences, setPreferences] = useState<CookieConsentPreferences | null>(null);
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  useEffect(() => {
    setPreferences(readCookieConsent());
    const handleConsentChange = (event: Event) => {
      setPreferences((event as CustomEvent<CookieConsentPreferences>).detail || readCookieConsent());
    };
    window.addEventListener('ilm-ai-cookie-consent-change', handleConsentChange);
    return () => window.removeEventListener('ilm-ai-cookie-consent-change', handleConsentChange);
  }, []);

  if (!clientId || !preferences?.marketing) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}
