'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { buildThemeId, getAppTheme, isDarkThemeId, parseAppTheme } from '@/lib/constants/themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — next-themes only knows the real theme client-side
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-lg" />;
  }

  const current = getAppTheme(theme);
  const currentTheme = parseAppTheme(theme);
  const isDark = isDarkThemeId(theme);
  const TargetIcon = isDark ? Sun : Moon;
  const targetMode = isDark ? 'light' : 'dark';

  const toggleMode = () => {
    window.localStorage.setItem('ilm-ai-theme-explicit', '1');
    setTheme(buildThemeId(currentTheme.family, targetMode));
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleMode}
      aria-label={`Switch ${current.name} to ${targetMode} mode`}
      title={`${current.name}: switch to ${targetMode} mode`}
      className="border-border bg-card/90 border"
    >
      <TargetIcon className="h-4 w-4" />
    </Button>
  );
}
