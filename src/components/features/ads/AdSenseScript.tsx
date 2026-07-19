'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { readCookieConsent, type CookieConsentPreferences } from '@/lib/utils/cookieConsent';
import { useAuth } from '@/hooks/auth/useAuth';

export function AdSenseScript() {
  const { user, isLoading } = useAuth();
  const [preferences, setPreferences] = useState<CookieConsentPreferences | null>(null);
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-4877865173601332';

  useEffect(() => {
    setPreferences(readCookieConsent());
    const handleConsentChange = (event: Event) => {
      setPreferences((event as CustomEvent<CookieConsentPreferences>).detail || readCookieConsent());
    };
    window.addEventListener('ilm-ai-cookie-consent-change', handleConsentChange);
    return () => window.removeEventListener('ilm-ai-cookie-consent-change', handleConsentChange);
  }, []);

  // Do not load the provider for guests or paid users. Paid plans are ad-free.
  if (isLoading || (user && user.subscriptionTier !== 'FREE') || !clientId || !preferences?.marketing) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}
