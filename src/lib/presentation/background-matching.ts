import type { PresentationBackground } from './types';

const STOP_WORDS = new Set(['and', 'the', 'for', 'with', 'from', 'into', 'about', 'presentation', 'slides', 'study']);

function matchTokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
  );
}

export function selectPresentationBackgrounds(
  backgrounds: PresentationBackground[],
  topic: string,
  subject: string
) {
  const requestTokens = matchTokens(`${subject} ${topic}`);
  const scored = backgrounds
    .filter((background) => !background.isGlobal)
    .map((background) => {
      const assetTokens = matchTokens(`${background.subject} ${background.keywords.join(' ')} ${background.name}`);
      let score = 0;
      for (const token of requestTokens) if (assetTokens.has(token)) score += 1;
      if (background.subject && subject.toLowerCase().includes(background.subject.toLowerCase())) score += 4;
      return { background, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.background.name.localeCompare(b.background.name));

  if (scored.length) return scored.map((item) => item.background);
  return backgrounds.filter((background) => background.isGlobal);
}
