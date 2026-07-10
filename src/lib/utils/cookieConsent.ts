export type CookieConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export const COOKIE_CONSENT_KEY = 'ilm_ai_cookie_consent';

export const DEFAULT_COOKIE_CONSENT: CookieConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

export function readCookieConsent(): CookieConsentPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    return { ...DEFAULT_COOKIE_CONSENT, ...JSON.parse(raw), necessary: true };
  } catch {
    return null;
  }
}

export function saveCookieConsent(preferences: CookieConsentPreferences) {
  if (typeof window === 'undefined') return;
  const next = { ...preferences, necessary: true };
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next));
  document.cookie = `${COOKIE_CONSENT_KEY}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=31536000; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent('ilm-ai-cookie-consent-change', { detail: next }));
}

export function openCookieSettings() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('ilm-ai-open-cookie-settings'));
}
