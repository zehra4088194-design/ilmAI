import { describe, expect, it } from 'vitest';
import { getCorrectOptionIndex, normalizeQuestionOptions } from './questions';

describe('diagnostic question normalization', () => {
  it('normalizes legacy option objects in their stored order', () => {
    expect(normalizeQuestionOptions({ a: 'One', b: 'Two', c: 'Three', d: 'Four' })).toEqual([
      'One',
      'Two',
      'Three',
      'Four',
    ]);
  });

  it('supports letter, numeric, object, and text answer keys', () => {
    const options = { a: 'One', b: 'Two', c: 'Three', d: 'Four' };
    expect(getCorrectOptionIndex(options, 'd')).toBe(3);
    expect(getCorrectOptionIndex(options, 2)).toBe(2);
    expect(getCorrectOptionIndex(options, { answer: 'b' })).toBe(1);
    expect(getCorrectOptionIndex(options, 'Three')).toBe(2);
  });
});
