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

const SMALL_TALK_REPLIES = [
  'Hi. Tell me the subject or chapter and I will help you directly.',
  'Hello. Send your question, MCQ, or chapter name.',
  'I am here. What do you want to study right now?',
  'Okay. Share the question or topic you need help with.',
  'Welcome back. Which subject should we start with?',
];

export function getLocalSmallTalkResponse(message: string, userId = '') {
  const seed = `${userId}:${message.trim().toLowerCase()}:${new Date().toISOString().slice(0, 10)}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return SMALL_TALK_REPLIES[hash % SMALL_TALK_REPLIES.length] || 'Hi. Tell me the subject or chapter and I will help you directly.';
}
