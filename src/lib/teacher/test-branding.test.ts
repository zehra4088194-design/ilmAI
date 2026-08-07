import { describe, expect, it } from 'vitest';
import { resolveTestBranding } from './test-branding';

describe('resolveTestBranding', () => {
  it('gates FREE behind an ad and forces the watermark', () => {
    const branding = resolveTestBranding('FREE');
    expect(branding.requiresAdGate).toBe(true);
    expect(branding.forceIlmAiWatermark).toBe(true);
    expect(branding.customHeader).toBeNull();
  });

  it('gives PRO a clean paper with no ad gate but keeps the watermark', () => {
    const branding = resolveTestBranding('PRO', { customHeader: 'Ignored for PRO' });
    expect(branding.requiresAdGate).toBe(false);
    expect(branding.forceIlmAiWatermark).toBe(true);
    expect(branding.customHeader).toBeNull();
  });

  it('lets ELITE set a custom header and watermark text', () => {
    const branding = resolveTestBranding('ELITE', {
      customHeader: 'Beaconhouse School System',
      customWatermarkText: 'BSS Confidential',
    });
    expect(branding.customHeader).toBe('Beaconhouse School System');
    expect(branding.customWatermarkText).toBe('BSS Confidential');
    expect(branding.forceIlmAiWatermark).toBe(true);
  });

  it('lets ELITE hide the ilm AI watermark', () => {
    const branding = resolveTestBranding('ELITE', { hidePlatformBranding: true });
    expect(branding.forceIlmAiWatermark).toBe(false);
    expect(branding.hidePlatformBranding).toBe(true);
  });

  it('rejects non-http(s) watermark image URLs', () => {
    const branding = resolveTestBranding('ELITE', { customWatermarkImageUrl: 'javascript:alert(1)' });
    expect(branding.customWatermarkImageUrl).toBeNull();
  });

  it('accepts a valid https watermark image URL', () => {
    const branding = resolveTestBranding('ELITE', {
      customWatermarkImageUrl: 'https://example.com/logo.png',
    });
    expect(branding.customWatermarkImageUrl).toBe('https://example.com/logo.png');
  });

  it('truncates overly long custom text instead of erroring', () => {
    const branding = resolveTestBranding('ELITE', { customHeader: 'x'.repeat(500) });
    expect(branding.customHeader?.length).toBe(120);
  });
});
