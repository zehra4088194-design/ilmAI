import { describe, expect, it } from 'vitest';
import { buildParentConnectPath, normalizeParentInvitePayload } from './invite-code';

describe('parent invite payload', () => {
  it('accepts raw codes and generated parent-link URLs', () => {
    expect(normalizeParentInvitePayload(' sv-a1b2c3 ')).toBe('SV-A1B2C3');
    expect(normalizeParentInvitePayload('https://ilmai.study/parent-link?code=sv-z9y8x7')).toBe('SV-Z9Y8X7');
    expect(normalizeParentInvitePayload('/parent-link?code=SV-Q1W2E3')).toBe('SV-Q1W2E3');
  });

  it('rejects unrelated links and malformed codes', () => {
    expect(normalizeParentInvitePayload('https://evil.example/connect?code=SV-A1B2C3')).toBeNull();
    expect(normalizeParentInvitePayload('hello SV-A1B2C3')).toBeNull();
    expect(normalizeParentInvitePayload('SV-123')).toBeNull();
  });

  it('always creates a same-origin relative connect path', () => {
    expect(buildParentConnectPath('sv-a1b2c3')).toBe('/parent-link?code=SV-A1B2C3');
  });
});
