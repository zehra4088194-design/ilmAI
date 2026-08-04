const SIMPLE_CHAT_PATTERNS = [
  /^(?:h+i+|h+y+|hey+|hello+|helo+|hola)$/i,
  /^(?:aoa|ass?alam(?:[ -]?o[ -]?alaikum)?|salam)$/i,
  /^(?:ok(?:ay)?|thanks?|thank you|shukriya|bye|goodbye)$/i,
  /^(?:good (?:morning|afternoon|evening|night))$/i,
];

/** Keep only genuinely trivial chat on Oracle's local model. */
export function shouldUseLocalSmallTalk(message: string): boolean {
  const normalized = message.trim().replace(/\s+/g, ' ');
  if (!normalized) return true;
  if (!/[\p{L}\p{N}]/u.test(normalized)) return normalized.length <= 24;

  const withoutDecoration = normalized
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return SIMPLE_CHAT_PATTERNS.some((pattern) => pattern.test(withoutDecoration));
}
