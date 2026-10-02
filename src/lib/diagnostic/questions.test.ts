import { describe, expect, it } from 'vitest';
import { getCorrectOptionIndex, normalizeChemicalFormulas, normalizeQuestionOptions } from './questions';

describe('diagnostic question normalization', () => {
  it('normalizes legacy option objects in their stored order', () => {
    expect(normalizeQuestionOptions({ a: 'One', b: 'Two', c: 'Three', d: 'Four' })).toEqual([
      'One',
      'Two',
      'Three',
      'Four',
    ]);
  });

  it('renders common chemical formulas with subscripts', () => {
    expect(normalizeChemicalFormulas('Absorbs O2 and evolves CO2')).toBe('Absorbs $O_{2}$ and evolves $CO_{2}
    const options = { a: 'One', b: 'Two', c: 'Three', d: 'Four' };
    expect(getCorrectOptionIndex(options, 'd')).toBe(3);
    expect(getCorrectOptionIndex(options, 2)).toBe(2);
    expect(getCorrectOptionIndex(options, { answer: 'b' })).toBe(1);
    expect(getCorrectOptionIndex(options, 'Three')).toBe(2);
  });
});
);
    expect(normalizeChemicalFormulas('Al2O3')).toBe('$Al_{2}O_{3}
    const options = { a: 'One', b: 'Two', c: 'Three', d: 'Four' };
    expect(getCorrectOptionIndex(options, 'd')).toBe(3);
    expect(getCorrectOptionIndex(options, 2)).toBe(2);
    expect(getCorrectOptionIndex(options, { answer: 'b' })).toBe(1);
    expect(getCorrectOptionIndex(options, 'Three')).toBe(2);
  });
});
);
    expect(normalizeChemicalFormulas('already $CO_2$ stays')).toBe('already $CO_2$ stays');
  });

  it('supports letter, numeric, object, and text answer keys', () => {
    const options = { a: 'One', b: 'Two', c: 'Three', d: 'Four' };
    expect(getCorrectOptionIndex(options, 'd')).toBe(3);
    expect(getCorrectOptionIndex(options, 2)).toBe(2);
    expect(getCorrectOptionIndex(options, { answer: 'b' })).toBe(1);
    expect(getCorrectOptionIndex(options, 'Three')).toBe(2);
  });
});
