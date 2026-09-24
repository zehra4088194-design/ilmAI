import { describe, expect, it } from 'vitest';
import { getAiCreditCost, summarizeAiCreditWindows } from './index';

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

  it('reports the Pro monthly common pool without a per-tool daily cap', () => {
    const status = summarizeAiCreditWindows('PRO', [{ key: 'pro-month', limit: 300, resetAt: 900 }], [24]);

    expect(status).toMatchObject({
      period: 'month',
      used: 24,
      remaining: 276,
      limit: 300,
      reset: 900,
      daily: null,
    });
  });

  it('reports the Elite 600-credit monthly pool', () => {
    const status = summarizeAiCreditWindows('ELITE', [{ key: 'elite-month', limit: 600, resetAt: 900 }], [125]);

    expect(status).toMatchObject({
      period: 'month',
      used: 125,
      remaining: 475,
      limit: 600,
      daily: null,
    });
  });
});

describe('getAiCreditCost', () => {
  it('charges two credits for the complete PDF summarizer flow', () => {
    expect(getAiCreditCost('university_pdf_summarizer')).toBe(2);
  });

  it('charges five credits for Research Helper', () => {
    expect(getAiCreditCost('university_research')).toBe(5);
  });
});
