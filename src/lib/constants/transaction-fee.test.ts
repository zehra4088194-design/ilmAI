import { describe, expect, it } from 'vitest';
import { calculateTransactionFee } from './index';

describe('calculateTransactionFee', () => {
  it('calculates five percent and rounds to cents for USD', () => {
    expect(calculateTransactionFee(2.99, 'USD')).toBe(0.15);
    expect(calculateTransactionFee(28.7, 'USD')).toBe(1.44);
  });

  it('calculates five percent and rounds to whole rupees for PKR', () => {
    expect(calculateTransactionFee(849, 'PKR')).toBe(42);
    expect(calculateTransactionFee(1399, 'PKR')).toBe(70);
  });

  it('returns zero for non-positive or non-finite amounts', () => {
    expect(calculateTransactionFee(0, 'USD')).toBe(0);
    expect(calculateTransactionFee(-10, 'PKR')).toBe(0);
    expect(calculateTransactionFee(Number.NaN, 'USD')).toBe(0);
  });
});
