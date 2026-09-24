const DEFAULT_CONTEXT_LIMIT = 12_000;
const WINDOW_SIZE = 1_200;

function clean(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * Builds a bounded, evenly distributed view of a companion TXT file.
 * The original PDF is intentionally not accepted here: all resource AI tools
 * share this TXT-only boundary.
 */
export function buildRepresentativeTextContext(value: string, maxCharacters = DEFAULT_CONTEXT_LIMIT) {
  const text = clean(value);
  const limit = Math.max(2_000, Math.floor(maxCharacters));
  if (text.length <= limit) return text;

  const windowCount = Math.max(2, Math.floor(limit / WINDOW_SIZE));
  const windows: string[] = [];
  for (let index = 0; index < windowCount; index += 1) {
    const progress = windowCount === 1 ? 0 : index / (windowCount - 1);
    const start = Math.min(text.length - WINDOW_SIZE, Math.floor(progress * (text.length - WINDOW_SIZE)));
    const raw = text.slice(start, start + WINDOW_SIZE);
    const leftBoundary = index === 0 ? 0 : raw.search(/(?:\n\s*\n|[.!?]\s)/);
    const content = raw.slice(leftBoundary > 0 && leftBoundary < 160 ? leftBoundary + 1 : 0).trim();
    windows.push(`[TXT section ${index + 1} of ${windowCount}]\n${content}`);
  }

  return windows.join('\n\n').slice(0, limit);
}
