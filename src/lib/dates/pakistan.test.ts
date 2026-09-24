import { describe, expect, it } from 'vitest';
import { addDaysIso, pakistanDateIso } from './pakistan';

describe('Pakistan planner dates', () => {
  it('uses the Pakistan calendar date across the UTC day boundary', () => {
    expect(pakistanDateIso(new Date('2026-07-26T20:30:00Z'))).toBe('2026-07-27');
  });

  it('adds calendar days without local timezone drift', () => {
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01');
  });
});
