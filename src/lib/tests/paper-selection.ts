// Pure selection/randomization helpers used by the teacher test generator.
// Kept side-effect free so they can be unit tested without touching Supabase.

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type DifficultyFilter = DifficultyLevel | 'MIXED' | undefined;

/** Fisher-Yates shuffle. Never mutates the input array. */
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }
  return copy;
}

/** De-duplicates items by a normalized version of their question text. */
export function uniqueByQuestion<T extends { q: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.q
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Prefers items matching the requested difficulty, but backfills with the
 * rest of the pool when there aren't enough matches — a paper should never
 * come up short just because a chapter has few HARD questions.
 */
export function prioritizeByDifficulty<T extends { difficulty?: string | null }>(
  items: T[],
  difficulty: DifficultyFilter
): T[] {
  if (!difficulty || difficulty === 'MIXED') return shuffle(items);
  const matching = items.filter((item) => (item.difficulty || 'MEDIUM').toUpperCase() === difficulty);
  const rest = items.filter((item) => (item.difficulty || 'MEDIUM').toUpperCase() !== difficulty);
  // Shuffle within each group so the requested difficulty still comes out
  // randomized, but matches are preferred over backfill items.
  return [...shuffle(matching), ...shuffle(rest)];
}

/**
 * Randomizes, de-duplicates, difficulty-prioritizes, then takes exactly
 * `count` items (or fewer if the pool is smaller). Every call reshuffles,
 * so back-to-back generations for the same chapter come out different.
 */
export function pickRandomQuestions<T extends { q: string; difficulty?: string | null }>(
  pool: T[],
  count: number,
  difficulty?: DifficultyFilter
): T[] {
  if (count <= 0) return [];
  const deduped = uniqueByQuestion(pool);
  const prioritized = prioritizeByDifficulty(deduped, difficulty);
  return prioritized.slice(0, count);
}
