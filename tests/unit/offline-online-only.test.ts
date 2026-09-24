import { describe, expect, it } from 'vitest';
import {
  isOnlineOnlyApiPath,
  isOnlineOnlyPagePath,
  ONLINE_ONLY_API_PREFIXES,
  ONLINE_ONLY_PAGE_PREFIXES,
} from '@/lib/offline/online-only';

describe('isOnlineOnlyApiPath', () => {
  it('matches every declared online-only API prefix', () => {
    for (const prefix of ONLINE_ONLY_API_PREFIXES) {
      const sample = prefix.endsWith('/') ? `${prefix}anything` : prefix;
      expect(isOnlineOnlyApiPath(sample)).toBe(true);
    }
  });

  it('matches nested routes under a prefix', () => {
    expect(isOnlineOnlyApiPath('/api/ai/chat')).toBe(true);
    expect(isOnlineOnlyApiPath('/api/vision/scan')).toBe(true);
    expect(isOnlineOnlyApiPath('/api/payments/create-session')).toBe(true);
  });

  it('does not match offline-capable routes', () => {
    expect(isOnlineOnlyApiPath('/api/resources/content')).toBe(false);
    expect(isOnlineOnlyApiPath('/api/offline/download-log')).toBe(false);
    expect(isOnlineOnlyApiPath('/api/leaderboard')).toBe(false);
  });

  it('does not false-positive on unrelated paths that merely share a prefix substring', () => {
    expect(isOnlineOnlyApiPath('/api/credits-history')).toBe(false);
    expect(isOnlineOnlyApiPath('/api/geolocation')).toBe(false);
  });
});

describe('isOnlineOnlyPagePath', () => {
  it('matches every declared online-only page prefix and its nested routes', () => {
    for (const prefix of ONLINE_ONLY_PAGE_PREFIXES) {
      expect(isOnlineOnlyPagePath(prefix)).toBe(true);
      expect(isOnlineOnlyPagePath(`${prefix}/nested`)).toBe(true);
    }
  });

  it('does not match offline-capable pages', () => {
    expect(isOnlineOnlyPagePath('/dashboard')).toBe(false);
    expect(isOnlineOnlyPagePath('/library')).toBe(false);
    expect(isOnlineOnlyPagePath('/downloads')).toBe(false);
  });

  it('does not false-positive on paths that merely share a prefix substring', () => {
    expect(isOnlineOnlyPagePath('/scanner')).toBe(false);
    expect(isOnlineOnlyPagePath('/ai-tutor-history')).toBe(false);
  });
});
