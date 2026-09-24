'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export type AdCategory = { id: string; name: string };

/**
 * Admin-managed category vocabulary (subjects like Chemistry/Biology, plus general ones like
 * Stationery or Physical Products) — banners pick up to 3 of these, never free-type. Both the
 * admin and seller banner forms read this same list via GET /api/ads/categories.
 */
export function AdCategoriesCard({ onChange }: { onChange?: (categories: AdCategory[]) => void }) {
  const [categories, setCategories] = useState<AdCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ads/categories');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Categories could not be loaded.');
      setCategories(json.categories || []);
      onChange?.(json.categories || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Categories could not be loaded.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addCategory() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const response = await fetch('/api/admin/ads/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Category could not be added.');
      setName('');
      setCategories(json.categories || []);
      onChange?.(json.categories || []);
      toast.success(`"${trimmed}" added.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Category could not be added.');
    } finally {
      setAdding(false);
    }
  }

  async function removeCategory(category: AdCategory) {
    if (!confirm(`Remove "${category.name}"? Banners already tagged with it keep the tag.`)) return;
    try {
      const response = await fetch(`/api/admin/ads/categories?id=${encodeURIComponent(category.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      const next = categories.filter((c) => c.id !== category.id);
      setCategories(next);
      onChange?.(next);
      toast.success('Category removed.');
    } catch {
      toast.error('Category could not be removed.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <p className="text-muted-foreground text-sm">
          Subjects (Chemistry, Biology, Computer Science, ...) or general categories (Stationery, Physical
          Products, ...) — a banner can be tagged with up to 3. Used to prefer a matching banner on a
          subject page; other banners still fill in when there aren&apos;t enough matches.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addCategory()}
            placeholder="e.g. Chemistry, Stationery, Mobile Accessories"
            className="max-w-xs"
          />
          <Button type="button" size="sm" variant="gradient" onClick={() => void addCategory()} disabled={adding || !name.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add category
          </Button>
        </div>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">No categories yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category.id} className="border-border bg-muted/30 flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm">
                {category.name}
                <button type="button" aria-label={`Remove ${category.name}`} onClick={() => void removeCategory(category)}>
                  <Trash2 className="text-muted-foreground hover:text-red-500 h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
