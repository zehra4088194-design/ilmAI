import type { PresentationBackground } from './types';

const STOP_WORDS = new Set(['and', 'the', 'for', 'with', 'from', 'into', 'about', 'presentation', 'slides', 'study']);

// Categories that count as "safe for anything" when nothing else matched — picked
// ahead of an unrelated, tightly-tagged image so the fallback still looks neutral.
const NEUTRAL_CATEGORIES = new Set(['abstract', 'uncategorized', 'general', 'minimal']);

function matchTokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
  );
}

function categoryOf(background: PresentationBackground) {
  return (background.category || 'uncategorized').toLowerCase();
}

export function selectPresentationBackgrounds(
  backgrounds: PresentationBackground[],
  topic: string,
  subject: string
) {
  if (!backgrounds.length) return [];

  const requestTokens = matchTokens(`${subject} ${topic}`);
  const requestText = `${subject} ${topic}`.toLowerCase();

  const scored = backgrounds
    .filter((background) => !background.isGlobal)
    .map((background) => {
      const category = categoryOf(background);
      const categoryText = category === 'uncategorized' ? '' : category;
      const assetTokens = matchTokens(
        `${background.subject} ${background.keywords.join(' ')} ${categoryText} ${background.name}`
      );
      let score = 0;
      for (const token of requestTokens) if (assetTokens.has(token)) score += 1;
      if (background.subject && subject.toLowerCase().includes(background.subject.toLowerCase())) score += 4;
      // Category match carries more weight than a single keyword overlap so a
      // well-tagged "science" background wins over a loosely-matched keyword hit.
      if (categoryText) {
        if (requestTokens.has(categoryText)) score += 3;
        else if (requestText.includes(categoryText)) score += 2;
      }
      return { background, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.background.name.localeCompare(b.background.name));

  if (scored.length) return scored.map((item) => item.background);

  const globalFallback = backgrounds.filter((background) => background.isGlobal);
  if (globalFallback.length) return globalFallback;

  // No topical match and no image was ever marked as a general fallback — rather
  // than leaving the deck without any imagery, prefer neutral-tagged backgrounds
  // (abstract/uncategorized/general) and, failing that, return whatever exists.
  const neutral = backgrounds.filter((background) => NEUTRAL_CATEGORIES.has(categoryOf(background)));
  if (neutral.length) return neutral;

  return backgrounds;
}
