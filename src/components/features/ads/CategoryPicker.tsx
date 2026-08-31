'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';

type AdCategory = { id: string; name: string };

const MAX_SELECTED = 3;

/**
 * Up-to-3 category picker shared by the admin and seller banner forms. Selectable only, never
 * free-typed — the vocabulary itself is admin-managed (see AdCategoriesCard). Self-fetches the
 * list from GET /api/ads/categories, which any logged-in user (admin or seller) can read.
 */
export function CategoryPicker({ selected, onChange }: { selected: string[]; onChange: (next: string[]) => void }) {
  const [categories, setCategories] = useState<AdCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ads/categories')
      .then((response) => (response.ok ? response.json() : { categories: [] }))
      .then((json) => {
        if (!cancelled) setCategories(json.categories || []);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(name: string) {
    if (selected.includes(name)) {
      onChange(selected.filter((s) => s !== name));
    } else if (selected.length < MAX_SELECTED) {
      onChange([...selected, name]);
    }
  }

  return (
    <div>
      <Label>
        Categories ({selected.length}/{MAX_SELECTED})
      </Label>
      <p className="text-muted-foreground mb-2 text-xs">
        Prefers this banner on matching subject pages (e.g. Chemistry) — other banners still fill in when
        there aren&apos;t enough matches.
      </p>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="text-muted-foreground text-sm">No categories yet — ask an admin to add some.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((category) => {
            const active = selected.includes(category.name);
            const disabled = !active && selected.length >= MAX_SELECTED;
            return (
              <button
                key={category.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(category.name)}
                aria-pressed={active}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition',
                  active
                    ? 'border-primary bg-primary/15 text-primary'
                    : disabled
                      ? 'border-border text-muted-foreground/50 cursor-not-allowed'
                      : 'border-border hover:border-primary/50'
                )}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
