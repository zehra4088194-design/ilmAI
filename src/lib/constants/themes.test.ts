import { describe, expect, it } from 'vitest';
import { APP_THEME_FAMILIES, APP_THEMES, buildThemeId, getThemeStylesheetHref, parseAppTheme } from './themes';

describe('theme families', () => {
  it('defines exactly 10 complete light and dark theme pairs', () => {
    expect(APP_THEME_FAMILIES).toHaveLength(10);
    expect(APP_THEMES).toHaveLength(20);

    for (const family of APP_THEME_FAMILIES) {
      expect(APP_THEMES.some((theme) => theme.className === buildThemeId(family.id, 'light'))).toBe(true);
      expect(APP_THEMES.some((theme) => theme.className === buildThemeId(family.id, 'dark'))).toBe(true);
    }
  });

  it('keeps mode toggles inside the selected family and uses one family stylesheet', () => {
    const current = parseAppTheme('theme-forest-dark');
    expect(buildThemeId(current.family, 'light')).toBe('theme-forest-light');
    expect(getThemeStylesheetHref(current.family)).toBe('/themes/theme-forest.css');
  });
});
