export const LOCALES = ['en', 'roman-ur'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

// Roman Urdu uses Latin characters, so both supported interfaces are LTR.
export const RTL_LOCALES: readonly Locale[] = [];

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function isValidLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export const COUNTRY_LOCALE_DEFAULTS: Record<string, Locale> = {
  PK: 'en',
  IN: 'en',
};

export function localeForCountry(country: string | undefined | null): Locale {
  if (!country) return DEFAULT_LOCALE;
  return COUNTRY_LOCALE_DEFAULTS[country.toUpperCase()] ?? DEFAULT_LOCALE;
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  'roman-ur': 'Roman Urdu',
};
