import en from '../../../messages/en.json';
import romanUr from '../../../messages/roman-ur.json';
import type { Locale } from './config';

export type Messages = typeof en;

function deepMerge<T>(fallback: T, override: unknown): T {
  if (!override || typeof override !== 'object' || Array.isArray(override)) return fallback;
  const result: Record<string, unknown> = { ...(fallback as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    const current = result[key];
    result[key] =
      current &&
      typeof current === 'object' &&
      !Array.isArray(current) &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
        ? deepMerge(current, value)
        : value;
  }
  return result as T;
}

const romanUrMessages = deepMerge(en, romanUr);

export function getMessages(locale: Locale): Messages {
  return locale === 'roman-ur' ? romanUrMessages : en;
}
