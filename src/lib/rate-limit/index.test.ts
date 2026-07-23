import { describe, expect, it } from 'vitest';
import { summarizeAiCreditWindows } from './index';

describe('summarizeAiCreditWindows', () => {
  it('reports the Free weekly pool', () => {
    const status = summarizeAiCreditWindows('FREE', [{ key: 'free-week', limit: 20, resetAt: 700 }], [4]);

    expect(status).toMatchObject({
      period: 'week',
      used: 4,
      remaining: 16,
      limit: 20,
      reset: 700,
      daily: null,
    });
  });

  it('reports the Pro monthly pool separately from its daily cap', () => {
    const status = summarizeAiCreditWindows(
      'PRO',
      [
        { key: 'pro-day', limit: 15, resetAt: 100 },
        { key: 'pro-month', limit: 300, resetAt: 900 },
      ],
      [2, 24]
    );

    expect(status).toMatchObject({
      period: 'month',
      used: 24,
      remaining: 276,
      limit: 300,
      reset: 900,
      daily: { used: 2, remaining: 13, limit: 15, reset: 100 },
    });
  });

  it('reports the Elite 600-credit monthly pool', () => {
    const status = summarizeAiCreditWindows(
      'ELITE',
      [
        { key: 'elite-day', limit: 30, resetAt: 100 },
        { key: 'elite-month', limit: 600, resetAt: 900 },
      ],
      [8, 125]
    );

    expect(status).toMatchObject({
      period: 'month',
      used: 125,
      remaining: 475,
      limit: 600,
      daily: { used: 8, remaining: 22, limit: 30 },
    });
  });
});
