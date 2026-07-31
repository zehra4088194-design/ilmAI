import { describe, expect, it } from 'vitest';
import { DEFAULT_PLATFORM_SETTINGS, normalizePlatformSettings, resolvePdfThemeMode } from './shared';

describe('PDF theme platform setting', () => {
  it('defaults to dark PDFs for existing settings records', () => {
    expect(normalizePlatformSettings({}).pdfThemeMode).toBe(DEFAULT_PLATFORM_SETTINGS.pdfThemeMode);
    expect(DEFAULT_PLATFORM_SETTINGS.pdfThemeMode).toBe('dark');
  });

  it('keeps supported admin selections and rejects unknown values', () => {
    expect(normalizePlatformSettings({ pdfThemeMode: 'follow-user' }).pdfThemeMode).toBe('follow-user');
    expect(normalizePlatformSettings({ pdfThemeMode: 'light' }).pdfThemeMode).toBe('light');
    expect(normalizePlatformSettings({ pdfThemeMode: 'sepia' }).pdfThemeMode).toBe('dark');
  });

  it('resolves follow-user without affecting forced PDF modes', () => {
    expect(resolvePdfThemeMode('follow-user', true)).toBe('dark');
    expect(resolvePdfThemeMode('follow-user', false)).toBe('light');
    expect(resolvePdfThemeMode('dark', false)).toBe('dark');
    expect(resolvePdfThemeMode('light', true)).toBe('light');
  });
});
