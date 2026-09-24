'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isValidLocale, type Locale } from '@/lib/i18n/config';
import { getMessages, type Messages } from '@/lib/i18n/translations';

interface I18nContextValue {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    isValidLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE
  );
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      // 1 year, path=/ so both marketing and dashboard routes read it.
      document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=31536000; SameSite=Lax`;
      // Server components (root layout's lang/dir, any server-rendered
      // copy) only pick up the new cookie after a refresh.
      router.refresh();
    },
    [router]
  );

  const messages = useMemo(() => getMessages(locale), [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, messages, setLocale }),
    [locale, messages, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function resolvePath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** t('auth.login.title') -> string, with the key itself as a safe fallback. */
export function useTranslations() {
  const { messages } = useI18n();
  return useCallback(
    (key: string, fallback?: string) => {
      const value = resolvePath(messages, key);
      if (typeof value === 'string') return value;
      return fallback ?? key;
    },
    [messages]
  );
}

/** Full typed messages tree — needed for arrays/objects (e.g. pricing features). */
export function useMessages() {
  return useI18n().messages;
}

export function useLocale() {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}
