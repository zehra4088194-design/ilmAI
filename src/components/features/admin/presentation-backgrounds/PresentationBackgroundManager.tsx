'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PresentationBackground } from '@/lib/presentation/types';

export function PresentationBackgroundManager() {
  const [items, setItems] = useState<PresentationBackground[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const response = await fetch('/api/admin/presentation-backgrounds');
    const json = await response.json();
    if (response.ok) setItems(json.backgrounds || []);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const form = new FormData();
    Array.from(files).forEach((file) => form.append('images', file));
    const response = await fetch('/api/admin/presentation-backgrounds', { method: 'POST', body: form });
    const json = await response.json();
    if (response.ok) {
      toast.success('Presentation backgrounds uploaded to Oracle storage.');
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
        <CardTitle>Oracle Presentation Backgrounds</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-muted-foreground text-sm">
          Upload JPG, PNG, or WebP images (maximum 10 MB each). New presentations automatically rotate through this
          library and add a readable dark overlay.
        </p>
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
              <div className="flex items-center justify-between gap-2 p-3">
                <span className="min-w-0 truncate text-xs">{item.name}</span>
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
