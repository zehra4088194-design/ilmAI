import type { PresentationBackground, PresentationTheme } from './types';

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

// Backgrounds saved before the dark/light split default to 'dark' — that was
// the only visual treatment (dark scrim + white text) the app ever rendered.
function modeOf(background: PresentationBackground): PresentationTheme {
  return background.mode === 'light' ? 'light' : 'dark';
}

export function selectPresentationBackgrounds(
  backgrounds: PresentationBackground[],
  topic: string,
  subject: string,
  // How many distinct images the deck ideally wants (one per slide). Used only to
  // widen the pool below when the best-matching set is too small to give every
  // slide a different photo — the ranking/priority itself is unaffected.
  desiredCount = 0,
  // Restrict the pool to backgrounds tagged for this theme before ranking by
  // topic, so a 'dark' deck never ends up with a bright daylight photo (or vice
  // versa) even when that off-tone image is the closest topical match.
  requestedMode?: PresentationTheme
) {
  if (!backgrounds.length) return [];

  // No images tagged for the requested mode yet? Fall back to the full pool
  // rather than showing no imagery at all — an off-tone photo still beats none.
  const modePool = requestedMode ? backgrounds.filter((background) => modeOf(background) === requestedMode) : backgrounds;
  const pool = modePool.length ? modePool : backgrounds;

  const requestTokens = matchTokens(`${subject} ${topic}`);
  const requestText = `${subject} ${topic}`.toLowerCase();

  const scored = pool
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

  let result: PresentationBackground[];
  if (scored.length) {
    result = scored.map((item) => item.background);
  } else {
    const globalFallback = pool.filter((background) => background.isGlobal);
    if (globalFallback.length) {
      result = globalFallback;
    } else {
      // No topical match and no image was ever marked as a general fallback —
      // rather than leaving the deck without any imagery, prefer neutral-tagged
      // backgrounds (abstract/uncategorized/general) and, failing that, return
      // whatever exists (still within the same dark/light pool).
      const neutral = pool.filter((background) => NEUTRAL_CATEGORIES.has(categoryOf(background)));
      result = neutral.length ? neutral : pool;
    }
  }

  // A too-small matched pool forces the deck to reuse the same one or two photos
  // on every slide. Top it up with the remaining, unrelated-but-available images
  // from the SAME mode pool (best matches still lead the rotation) so a slide
  // count larger than the matched set still cycles through distinct pictures
  // instead of repeating — and never crosses into the wrong dark/light tone.
  if (desiredCount > result.length && result.length < pool.length) {
    const used = new Set(result.map((background) => background.name));
    const extras = pool.filter((background) => !used.has(background.name));
    result = [...result, ...extras].slice(0, Math.max(desiredCount, result.length));
  }

  return result;
}
