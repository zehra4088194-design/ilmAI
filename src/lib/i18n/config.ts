/**
 * Central i18n config for ilm AI.
 *
 * We use a lightweight, cookie-based i18n system (no URL locale prefix)
 * instead of next-intl's routing, since the app's route structure
 * (marketing, auth, dashboard, admin, parent) is already established and
 * a URL prefix like /en/... or /ur/... would mean restructuring every
 * existing route. The cookie is readable by both server components
 * (via `next/headers` cookies()) and the client (via document.cookie),
 * so the initial paint always matches the saved preference.
 */

export const LOCALES = ['en', 'ur', 'hi'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Cookie the whole app reads/writes to persist the chosen language. */
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

/** Locales that should render right-to-left. */
export const RTL_LOCALES: readonly Locale[] = ['ur'];

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function isValidLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/**
 * First-visit default by detected country (from /api/geo or request
 * headers). Students can always override this from the LanguageSwitcher
 * or Settings — this only decides what a brand-new visitor sees before
 * they've made a choice.
 */
export const COUNTRY_LOCALE_DEFAULTS: Record<string, Locale> = {
  PK: 'ur',
  IN: 'hi',
};

export function localeForCountry(country: string | undefined | null): Locale {
  if (!country) return DEFAULT_LOCALE;
  return COUNTRY_LOCALE_DEFAULTS[country.toUpperCase()] ?? DEFAULT_LOCALE;
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ur: 'اردو',
  hi: 'हिन्दी',
};
