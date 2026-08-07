import { describe, expect, it } from 'vitest';
import { pickRandomQuestions, prioritizeByDifficulty, shuffle, uniqueByQuestion } from './paper-selection';

describe('shuffle', () => {
  it('keeps every element, just reorders them', () => {
    const input = Array.from({ length: 20 }, (_, index) => index);
    const result = shuffle(input);
    expect(result).toHaveLength(input.length);
    expect([...result].sort((a, b) => a - b)).toEqual(input);
  });

  it('does not mutate the original array', () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });
});

describe('uniqueByQuestion', () => {
  it('drops case/punctuation-insensitive duplicates', () => {
    const items = [{ q: 'What is 2+2?' }, { q: 'what is 2+2' }, { q: 'What is 3+3?' }];
    expect(uniqueByQuestion(items)).toHaveLength(2);
  });

  it('drops blank questions', () => {
    expect(uniqueByQuestion([{ q: '' }, { q: '   ' }, { q: 'Real question' }])).toHaveLength(1);
  });
});

describe('prioritizeByDifficulty', () => {
  const items = [
    { q: 'a', difficulty: 'EASY' },
    { q: 'b', difficulty: 'HARD' },
    { q: 'c', difficulty: 'EASY' },
    { q: 'd', difficulty: 'MEDIUM' },
  ];

  it('puts matching-difficulty items first', () => {
    const result = prioritizeByDifficulty(items, 'EASY');
    expect(result.slice(0, 2).map((item) => item.difficulty)).toEqual(['EASY', 'EASY']);
    expect(result).toHaveLength(4);
  });

  it('passes items through unchanged in count (still shuffled) for MIXED/undefined', () => {
    expect(prioritizeByDifficulty(items, 'MIXED')).toHaveLength(4);
    expect(prioritizeByDifficulty(items, undefined)).toHaveLength(4);
  });
});

describe('pickRandomQuestions', () => {
  const pool = Array.from({ length: 30 }, (_, index) => ({
    q: `Question ${index}`,
    difficulty: index % 3 === 0 ? 'HARD' : 'EASY',
  }));

  it('never returns more than requested', () => {
    expect(pickRandomQuestions(pool, 5)).toHaveLength(5);
  });

  it('returns the full pool (deduped) when count exceeds availability', () => {
    expect(pickRandomQuestions(pool.slice(0, 3), 10)).toHaveLength(3);
  });

  it('returns nothing for a zero or negative count', () => {
    expect(pickRandomQuestions(pool, 0)).toHaveLength(0);
    expect(pickRandomQuestions(pool, -5)).toHaveLength(0);
  });

  it('prefers the requested difficulty when enough matches exist', () => {
    const result = pickRandomQuestions(pool, 5, 'HARD');
    expect(result.every((item) => item.difficulty === 'HARD')).toBe(true);
  });

  it('backfills with other difficulties when matches run out', () => {
    const smallHardPool = pool.filter((item) => item.difficulty === 'HARD').slice(0, 2);
    const easyPool = pool.filter((item) => item.difficulty === 'EASY').slice(0, 10);
    const result = pickRandomQuestions([...smallHardPool, ...easyPool], 6, 'HARD');
    expect(result).toHaveLength(6);
    expect(result.filter((item) => item.difficulty === 'HARD')).toHaveLength(2);
  });

  it('de-duplicates before selecting', () => {
    const duped = [{ q: 'Same?' }, { q: 'same' }, { q: 'Different' }];
    expect(pickRandomQuestions(duped, 10)).toHaveLength(2);
  });

  it('produces different orderings across repeated calls on a large pool', () => {
    const orders = new Set<string>();
    for (let i = 0; i < 5; i += 1) {
      orders.add(
        pickRandomQuestions(pool, 8)
          .map((item) => item.q)
          .join(',')
      );
    }
    // Extremely unlikely to collide 5/5 times on a 30-item pool if shuffling works.
    expect(orders.size).toBeGreaterThan(1);
  });
});
