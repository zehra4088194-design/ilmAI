'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { APP_THEME_FAMILIES, buildThemeId, parseAppTheme } from '@/lib/constants/themes';
import { cn } from '@/lib/utils/cn';

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn('grid gap-3', compact ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')} />;
  }

  const activeTheme = parseAppTheme(theme);

  return (
    <div className={cn('grid gap-3', compact ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}>
      {APP_THEME_FAMILIES.map((option) => {
        const selected = activeTheme.family === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            data-selectable="true"
            onClick={() => {
              window.localStorage.setItem('ilm-ai-theme-explicit', '1');
              setTheme(buildThemeId(option.id, activeTheme.mode));
            }}
            className={cn(
              'group overflow-hidden rounded-xl border text-left transition-all hover:-translate-y-0.5',
              selected ? 'border-primary shadow-primary/20 shadow-lg' : 'border-border'
            )}
          >
            <div
              className="bg-muted relative h-20"
              style={{
                backgroundImage: option.image
                  ? `linear-gradient(135deg, rgba(0,0,0,0.04), rgba(0,0,0,0.16)), url(${option.image})`
                  : `linear-gradient(135deg, ${option.swatches[0]}, ${option.swatches[1]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute top-3 left-3 flex gap-1.5">
                {option.swatches.map((swatch) => (
                  <span
                    key={swatch}
                    className="h-3 w-3 rounded-full border border-white/70 shadow"
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
              {selected && (
                <span className="bg-primary text-primary-foreground absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full shadow">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </div>
            <div className="flex items-start gap-2 p-3">
              <Icon className="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="block text-sm font-semibold">{option.name}</span>
                {!compact && (
                  <span className="text-muted-foreground mt-0.5 block text-xs leading-5">{option.description}</span>
                )}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
