'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { getThemeStylesheetHref, parseAppTheme, THEME_COOKIE_NAME } from '@/lib/constants/themes';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function ThemeRuntime() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!theme) return;

    const selected = parseAppTheme(theme);
    const root = document.documentElement;
    root.dataset.themeFamily = selected.family;
    root.dataset.themeMode = selected.mode;
    document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(selected.className)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;

    const stylesheet = document.getElementById('ilm-ai-theme-stylesheet') as HTMLLinkElement | null;
    if (stylesheet && stylesheet.dataset.themeFamily !== selected.family) {
      stylesheet.href = getThemeStylesheetHref(selected.family);
      stylesheet.dataset.themeFamily = selected.family;
    }
  }, [theme]);

  return null;
}
