import { describe, expect, it } from 'vitest';
import {
  getPublicRequestUrl,
  getRequestHost,
  isPlayConsumptionOnlyHost,
  isPlayConsumptionOnlyRequest,
  PLAY_CONSUMPTION_ONLY_HEADER,
} from './distribution';

describe('payment distribution channel', () => {
  it('recognizes only configured Play consumption-only hosts', () => {
    const configured = 'app.example.com, play.example.com';

    expect(isPlayConsumptionOnlyHost('APP.EXAMPLE.COM:443', configured)).toBe(true);
    expect(isPlayConsumptionOnlyHost('play.example.com', configured)).toBe(true);
    expect(isPlayConsumptionOnlyHost('www.example.com', configured)).toBe(false);
  });

  it('uses the first forwarded host supplied by the trusted proxy', () => {
    const headers = new Headers({
      host: 'internal-web:3000',
      'x-forwarded-host': 'app.example.com, proxy.internal',
    });

    expect(getRequestHost(headers)).toBe('app.example.com, proxy.internal');
    expect(isPlayConsumptionOnlyHost(getRequestHost(headers), 'app.example.com')).toBe(true);
  });

  it('accepts the marker injected by middleware for downstream rendering', () => {
    const headers = new Headers({ [PLAY_CONSUMPTION_ONLY_HEADER]: '1' });
    expect(isPlayConsumptionOnlyRequest(headers)).toBe(true);
  });

  it('builds redirects from the trusted public proxy origin', () => {
    const headers = new Headers({
      host: 'internal-web:3000',
      'x-forwarded-host': 'app.example.com, proxy.internal',
      'x-forwarded-proto': 'https',
    });

    expect(getPublicRequestUrl(headers, 'http://localhost:3000/checkout?plan=PRO', '/subscription').toString()).toBe(
      'https://app.example.com/subscription'
    );
  });
});
