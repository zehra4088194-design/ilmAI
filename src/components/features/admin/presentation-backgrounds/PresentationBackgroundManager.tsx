'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Loader2, Moon, Sun, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { PRESENTATION_BACKGROUND_CATEGORIES } from '@/lib/presentation/types';
import type { PresentationBackground, PresentationTheme } from '@/lib/presentation/types';

const MODE_OPTIONS: { key: PresentationTheme; label: string; icon: typeof Moon }[] = [
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'light', label: 'Light', icon: Sun },
];

export function PresentationBackgroundManager() {
  const [items, setItems] = useState<PresentationBackground[]>([]);
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState('');
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState<PresentationTheme>('dark');
  const [isGlobal, setIsGlobal] = useState(false);

  async function refresh() {
    const response = await fetch('/api/admin/presentation-backgrounds');
    const json = await response.json();
    if (response.ok) setItems(json.backgrounds || []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  // Suggest categories/keywords already used on disk, on top of the fixed presets,
  // so admins reuse the same naming instead of inventing near-duplicate tags.
  const categoryOptions = useMemo(() => {
    const used = items
      .map((item) => (item.category || '').toLowerCase())
      .filter((value) => value && value !== 'uncategorized');
    return [...new Set([...PRESENTATION_BACKGROUND_CATEGORIES, ...used])].sort();
  }, [items]);

  const keywordSuggestions = useMemo(() => {
    const all = items.flatMap((item) => item.keywords);
    return [...new Set(all)].sort().slice(0, 24);
  }, [items]);

  function addKeywordSuggestion(tag: string) {
    const current = keywords
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (current.some((value) => value.toLowerCase() === tag.toLowerCase())) return;
    setKeywords([...current, tag].join(', '));
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const form = new FormData();
    Array.from(files).forEach((file) => form.append('images', file));
    form.set('subject', subject);
    form.set('keywords', keywords);
    form.set('category', category);
    form.set('mode', mode);
    form.set('isGlobal', String(isGlobal));
    const response = await fetch('/api/admin/presentation-backgrounds', { method: 'POST', body: form });
    const json = await response.json();
    if (response.ok) {
      toast.success('Presentation backgrounds uploaded to Supabase storage.');
      await refresh();
    } else toast.error(json.error || 'Upload failed.');
    setBusy(false);
  }

  async function remove(name: string) {
    const response = await fetch(`/api/admin/presentation-backgrounds?name=${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      setItems((current) => current.filter((item) => item.name !== name));
      toast.success('Background removed.');
    } else toast.error('Background could not be removed.');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Presentation Backgrounds</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-muted-foreground text-sm">
          Add a subject, category, and topic keywords before uploading. The presentation builder matches these
          labels against the requested topic, then rotates only through relevant images.
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Theme mode</label>
          <p className="text-muted-foreground mb-2 text-xs">
            Dark theme decks only pull dark-tagged photos (white text on top); light theme decks only pull
            light-tagged photos (dark text on top). Pick the tone that matches these images.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MODE_OPTIONS.map(({ key, label, icon: Icon }) => {
              const active = mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMode(key)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 text-sm font-medium transition',
                    active
                      ? key === 'dark'
                        ? 'border-slate-700 bg-slate-900 text-white'
                        : 'border-amber-300 bg-amber-50 text-slate-900'
                      : 'border-input hover:border-violet-300'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Subject
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="e.g. Biology"
              className="border-input bg-background h-10 w-full rounded-lg border px-3 font-normal"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Category / type
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="e.g. science, business, abstract"
              list="presentation-background-categories"
              className="border-input bg-background h-10 w-full rounded-lg border px-3 font-normal"
            />
            <datalist id="presentation-background-categories">
              {categoryOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>
        </div>
        <label className="space-y-1.5 text-sm font-medium block">
          Keywords / topics
          <input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="photosynthesis, cells, plants"
            className="border-input bg-background h-10 w-full rounded-lg border px-3 font-normal"
          />
        </label>
        {keywordSuggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground text-xs">Existing tags:</span>
            {keywordSuggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addKeywordSuggestion(tag)}
                className="bg-muted hover:bg-muted/70 rounded-full px-2.5 py-1 text-xs transition"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isGlobal} onChange={(event) => setIsGlobal(event.target.checked)} />
          Use these as general fallback backgrounds when no related image matches
        </label>
        <label className="border-border hover:bg-muted/40 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-sm font-medium transition">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {busy ? 'Uploading...' : 'Choose background images'}
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(event) => void upload(event.target.files)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.name} className="overflow-hidden rounded-xl border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="Presentation background" className="aspect-video w-full object-cover" />
              <div className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-xs font-medium">{item.name}</p>
                  <div className="flex flex-wrap items-center gap-1">
                    <span
                      className={cn(
                        'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        item.mode === 'light' ? 'bg-amber-500/15 text-amber-600' : 'bg-slate-500/15 text-slate-500'
                      )}
                    >
                      {item.mode === 'light' ? <Sun className="h-2.5 w-2.5" /> : <Moon className="h-2.5 w-2.5" />}
                      {item.mode === 'light' ? 'Light' : 'Dark'}
                    </span>
                    {item.category && item.category !== 'uncategorized' && (
                      <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-500">
                        {item.category}
                      </span>
                    )}
                    {item.isGlobal && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                        General fallback
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {[item.subject, item.keywords.join(', ')].filter(Boolean).join(' • ') ||
                      (item.isGlobal ? 'No labels needed' : 'Needs labels')}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Delete background" onClick={() => void remove(item.name)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {!items.length && <p className="text-muted-foreground text-sm">No custom backgrounds uploaded yet.</p>}
      </CardContent>
    </Card>
  );
}
