'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { readCookieConsent, type CookieConsentPreferences } from '@/lib/utils/cookieConsent';

const DISTINCT_ID_KEY = 'ilm_ai_posthog_distinct_id';

function getDistinctId() {
  let id = window.localStorage.getItem(DISTINCT_ID_KEY);
  if (!id) {
    id = `anon_${crypto.randomUUID()}`;
    window.localStorage.setItem(DISTINCT_ID_KEY, id);
  }
  return id;
}

export function PostHogClient() {
  const pathname = usePathname();
  const [preferences, setPreferences] = useState<CookieConsentPreferences | null>(null);
  const lastCapture = useRef('');
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

  useEffect(() => {
    setPreferences(readCookieConsent());
    const handleConsentChange = (event: Event) => {
      setPreferences((event as CustomEvent<CookieConsentPreferences>).detail || readCookieConsent());
    };
    window.addEventListener('ilm-ai-cookie-consent-change', handleConsentChange);
    return () => window.removeEventListener('ilm-ai-cookie-consent-change', handleConsentChange);
  }, []);

  useEffect(() => {
    if (!apiKey || !preferences?.analytics) return;
    const url = `${window.location.pathname}${window.location.search}`;
    if (lastCapture.current === url) return;
    lastCapture.current = url;

    const endpoint = `${host.replace(/\/$/, '')}/capture/`;
    const body = JSON.stringify({
      api_key: apiKey,
      event: '$pageview',
      properties: {
        distinct_id: getDistinctId(),
        $current_url: window.location.href,
        $pathname: window.location.pathname,
        source: 'ilm-ai-web',
      },
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      return;
    }
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }, [apiKey, host, pathname, preferences?.analytics]);

  return null;
}
