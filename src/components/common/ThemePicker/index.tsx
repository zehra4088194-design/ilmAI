'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { APP_THEMES } from '@/lib/constants/themes';
import { cn } from '@/lib/utils/cn';

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={cn('grid gap-3', compact ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')} />;
  }

  return (
    <div className={cn('grid gap-3', compact ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}>
      {APP_THEMES.map((option) => {
        const selected = theme === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            className={cn(
              'group overflow-hidden rounded-xl border bg-card/80 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/10',
              selected ? 'border-primary bg-primary/15 shadow-lg shadow-primary/20' : 'border-border'
            )}
          >
            <div
              className="relative h-20 bg-muted"
              style={{
                backgroundImage: option.image
                  ? `linear-gradient(135deg, rgba(0,0,0,0.04), rgba(0,0,0,0.16)), url(${option.image})`
                  : `linear-gradient(135deg, ${option.swatches[0]}, ${option.swatches[1]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute left-3 top-3 flex gap-1.5">
                {option.swatches.map((swatch) => (
                  <span key={swatch} className="h-3 w-3 rounded-full border border-white/70 shadow" style={{ backgroundColor: swatch }} />
                ))}
              </div>
              {selected && (
                <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Check className="h-4 w-4" />
                </span>
              )}
            </div>
            <div className="flex items-start gap-2 p-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-semibold">{option.name}</span>
                {!compact && <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{option.description}</span>}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
