import { describe, expect, it } from 'vitest';
import { selectEffectiveSubscription } from './subscription-access';

const now = new Date('2026-07-17T00:00:00.000Z');

describe('effective subscription access', () => {
  it('keeps the highest active tier when another subscription is canceled', () => {
    expect(
      selectEffectiveSubscription(
        [
          { tier: 'PRO', status: 'canceled', current_period_end: '2026-08-17T00:00:00.000Z' },
          { tier: 'ELITE', status: 'active', current_period_end: '2026-08-01T00:00:00.000Z' },
        ],
        now
      )
    ).toEqual({ tier: 'ELITE', expiresAt: '2026-08-01T00:00:00.000Z' });
  });

  it('ignores paused and expired subscriptions', () => {
    expect(
      selectEffectiveSubscription(
        [
          { tier: 'ELITE', status: 'paused', current_period_end: '2026-08-17T00:00:00.000Z' },
          { tier: 'PRO', status: 'active', current_period_end: '2026-07-16T00:00:00.000Z' },
        ],
        now
      )
    ).toEqual({ tier: 'FREE', expiresAt: null });
  });

  it('uses the latest expiry when active subscriptions have the same tier', () => {
    expect(
      selectEffectiveSubscription(
        [
          { tier: 'PRO', status: 'past_due', current_period_end: '2026-07-25T00:00:00.000Z' },
          { tier: 'PRO', status: 'active', current_period_end: '2026-08-17T00:00:00.000Z' },
        ],
        now
      )
    ).toEqual({ tier: 'PRO', expiresAt: '2026-08-17T00:00:00.000Z' });
  });
});
