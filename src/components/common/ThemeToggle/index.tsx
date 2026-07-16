'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
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
  const CurrentIcon = current.icon;
  const currentTheme = parseAppTheme(theme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle light or dark mode"
          className="border-border bg-card/90 border"
        >
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{current.name}</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setTheme(buildThemeId(currentTheme.family, 'light'))}
          className={cn(
            'bg-popover gap-2 border border-transparent',
            !isDarkThemeId(theme) && 'border-primary bg-primary/25 text-foreground'
          )}
        >
          <Sun className="h-4 w-4" />
          <span className="flex-1">Light Mode</span>
          <span className="text-muted-foreground text-xs">Same theme</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme(buildThemeId(currentTheme.family, 'dark'))}
          className={cn(
            'bg-popover gap-2 border border-transparent',
            isDarkThemeId(theme) && 'border-primary bg-primary/25 text-foreground'
          )}
        >
          <Moon className="h-4 w-4" />
          <span className="flex-1">Dark Mode</span>
          <span className="text-muted-foreground text-xs">Same theme</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
