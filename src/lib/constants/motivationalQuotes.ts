// Backward-compatible wrapper for the shared motivation library.
// All daily emails/notifications now use the same centralized quote pool as the app.
export { MOTIVATION_QUOTES as MOTIVATIONAL_QUOTES } from '@/lib/ai/motivation-quotes';

import { MOTIVATION_QUOTES } from '@/lib/ai/motivation-quotes';

export function randomMotivationalQuote(): string {
  return MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)]!;
}
