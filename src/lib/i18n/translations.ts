import en from '../../../messages/en.json';
import ur from '../../../messages/ur.json';
import hi from '../../../messages/hi.json';
import type { Locale } from './config';

export const MESSAGES = { en, ur, hi } satisfies Record<Locale, typeof en>;

export type Messages = typeof en;

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale] ?? MESSAGES.en;
}
