'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, ImagePlus, Loader2, Pause, Play, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AD_PLACEMENTS,
  AD_PLACEMENT_LABELS,
  AD_TARGET_AUDIENCES,
  type AdPlacement,
  type AdTargetAudience,
} from '@/lib/ads/constants';
import { CategoryPicker } from '@/components/features/ads/CategoryPicker';

type AdBanner = {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  placement: AdPlacement;
  categories: string[];
  targetAudience: AdTargetAudience | null;
  weight: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type BannerStats = {
  banner: AdBanner;
  impressions: number;
  clicks: number;
  conversions: number;
  orderValueTotal: number;
  conversionRate: number;
};

type SortKey = 'title' | 'impressions' | 'clicks' | 'conversions' | 'orderValueTotal' | 'conversionRate';

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Banner' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'conversions', label: 'Conversions' },
  { key: 'orderValueTotal', label: 'Order Value' },
  { key: 'conversionRate', label: 'Conv. Rate' },
];

// See the identical helpers in HouseAdsManager for why this conversion happens in the browser.
function isoToDatetimeLocalValue(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function datetimeLocalValueToIso(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

const EMPTY_FORM = {
  title: '',
  targetUrl: '',
  placement: AD_PLACEMENTS[0] as AdPlacement,
  categories: [] as string[],
  targetAudience: '' as '' | AdTargetAudience,
  weight: '1',
  isActive: true,
  startsAt: '',
  endsAt: '',
};

/**
 * The /seller counterpart to HouseAdsManager — deliberately a separate, trimmed component rather
 * than a shared one: no Placements toggles, no Sellers list, nothing platform-wide. Talks only to
 * /api/seller/ads*, which itself only ever reads/writes banners this seller created.
 */
export function SellerAdsManager() {
  const [stats, setStats] = useState<BannerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('impressions');
  const [sortDesc, setSortDesc] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdBanner | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const response = await fetch(`/api/seller/ads?${params.toString()}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Banners could not be loaded.');
      setStats(json.banners || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Banners could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(() => {
    const copy = [...stats];
    copy.sort((a, b) => {
      const va = sortKey === 'title' ? a.banner.title.toLowerCase() : a[sortKey];
      const vb = sortKey === 'title' ? b.banner.title.toLowerCase() : b[sortKey];
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDesc ? -cmp : cmp;
    });
    return copy;
  }, [stats, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setDialogOpen(true);
  }

  function openEdit(banner: AdBanner) {
    setEditing(banner);
    setForm({
      title: banner.title,
      targetUrl: banner.targetUrl,
      placement: banner.placement,
      categories: banner.categories || [],
      targetAudience: banner.targetAudience || '',
      weight: String(banner.weight),
      isActive: banner.isActive,
      startsAt: banner.startsAt ? isoToDatetimeLocalValue(banner.startsAt) : '',
      endsAt: banner.endsAt ? isoToDatetimeLocalValue(banner.endsAt) : '',
    });
    setImageFile(null);
    setDialogOpen(true);
  }

  async function save() {
    if (!form.title.trim()) return toast.error('Title is required.');
    if (!form.targetUrl.trim()) return toast.error('Target URL is required.');
    if (!editing && !imageFile) return toast.error('Choose a banner image.');

    setSaving(true);
    try {
      const body = new FormData();
      body.set('title', form.title.trim());
      body.set('targetUrl', form.targetUrl.trim());
      body.set('placement', form.placement);
      body.append('categories', '');
      form.categories.forEach((category) => body.append('categories', category));
      body.set('targetAudience', form.targetAudience);
      body.set('weight', form.weight);
      body.set('isActive', String(form.isActive));
      body.set('startsAt', datetimeLocalValueToIso(form.startsAt));
      body.set('endsAt', datetimeLocalValueToIso(form.endsAt));
      if (imageFile) body.set('image', imageFile);

      const response = await fetch(editing ? `/api/seller/ads/${editing.id}` : '/api/seller/ads', {
        method: editing ? 'PATCH' : 'POST',
        body,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Banner could not be saved.');

      toast.success(editing ? 'Banner updated.' : 'Banner created.');
      setDialogOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Banner could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(banner: AdBanner) {
    try {
      const response = await fetch(`/api/seller/ads/${banner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
      if (!response.ok) throw new Error('Could not update.');
      setStats((current) =>
        current.map((row) => (row.banner.id === banner.id ? { ...row, banner: { ...row.banner, isActive: !banner.isActive } } : row))
      );
      toast.success(banner.isActive ? 'Banner paused.' : 'Banner resumed.');
    } catch {
      toast.error('Banner status could not be changed.');
    }
  }

  async function remove(banner: AdBanner) {
    if (!confirm(`Delete "${banner.title}"? Its click and impression history will also be deleted.`)) return;
    try {
      const response = await fetch(`/api/seller/ads/${banner.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed.');
      setStats((current) => current.filter((row) => row.banner.id !== banner.id));
      toast.success('Banner deleted.');
    } catch {
      toast.error('Banner could not be deleted.');
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Your Banners</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-auto" aria-label="From date" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-auto" aria-label="To date" />
            <Button size="sm" variant="gradient" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Banner
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <p className="text-muted-foreground p-6 text-sm">Loading…</p>
          ) : sorted.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">No banners yet. Create one to start promoting ilmai.store.</p>
          ) : (
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-border border-y text-left">
                  {SORT_COLUMNS.map((col) => (
                    <th key={col.key} className="p-3">
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="hover:text-foreground text-muted-foreground flex items-center gap-1 font-medium"
                      >
                        {col.label} <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                  ))}
                  <th className="p-3">Placement</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ banner, impressions, clicks, conversions, orderValueTotal, conversionRate }) => (
                  <tr key={banner.id} className="border-border/50 border-b">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={banner.imageUrl} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{banner.title}</p>
                          <p className="text-muted-foreground truncate text-xs">{banner.targetUrl}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{impressions.toLocaleString()}</td>
                    <td className="p-3">{clicks.toLocaleString()}</td>
                    <td className="p-3">{conversions.toLocaleString()}</td>
                    <td className="p-3">{orderValueTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3">{(conversionRate * 100).toFixed(1)}%</td>
                    <td className="p-3">
                      <Badge variant="outline">{AD_PLACEMENT_LABELS[banner.placement]}</Badge>
                      {banner.targetAudience && (
                        <Badge variant="outline" className="ml-1 capitalize">
                          {banner.targetAudience}
                        </Badge>
                      )}
                      {banner.categories.map((category) => (
                        <Badge key={category} variant="outline" className="ml-1">
                          {category}
                        </Badge>
                      ))}
                    </td>
                    <td className="p-3">
                      <Badge variant={banner.isActive ? 'success' : 'outline'}>{banner.isActive ? 'Active' : 'Paused'}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon" aria-label="Edit banner" onClick={() => openEdit(banner)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={banner.isActive ? 'Pause banner' : 'Resume banner'}
                          onClick={() => void toggleActive(banner)}
                        >
                          {banner.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Delete banner" onClick={() => void remove(banner)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Banner' : 'New Banner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="seller-ad-title">Title (internal label)</Label>
              <Input id="seller-ad-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Back-to-school sale" />
            </div>
            <div>
              <Label htmlFor="seller-ad-target-url">Target URL on ilmai.store</Label>
              <Input
                id="seller-ad-target-url"
                value={form.targetUrl}
                onChange={(e) => setForm((f) => ({ ...f, targetUrl: e.target.value }))}
                placeholder="/promo/back-to-school or https://ilmai.store/promo/back-to-school"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Always redirects to ilmai.store — a full URL from another host has its host discarded.
              </p>
            </div>
            <CategoryPicker selected={form.categories} onChange={(next) => setForm((f) => ({ ...f, categories: next }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="seller-ad-placement">Placement</Label>
                <Select value={form.placement} onValueChange={(value) => setForm((f) => ({ ...f, placement: value as AdPlacement }))}>
                  <SelectTrigger id="seller-ad-placement">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AD_PLACEMENTS.map((placement) => (
                      <SelectItem key={placement} value={placement}>
                        {AD_PLACEMENT_LABELS[placement]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="seller-ad-audience">Audience</Label>
                <Select
                  value={form.targetAudience || 'everyone'}
                  onValueChange={(value) => setForm((f) => ({ ...f, targetAudience: value === 'everyone' ? '' : (value as AdTargetAudience) }))}
                >
                  <SelectTrigger id="seller-ad-audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">Everyone</SelectItem>
                    {AD_TARGET_AUDIENCES.map((role) => (
                      <SelectItem key={role} value={role} className="capitalize">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="seller-ad-weight">Weight</Label>
                <Input id="seller-ad-weight" type="number" min={1} value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="seller-ad-starts">Starts (optional)</Label>
                <Input id="seller-ad-starts" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="seller-ad-ends">Ends (optional)</Label>
                <Input id="seller-ad-ends" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v === true }))} />
              Active
            </label>
            <div>
              <Label>Banner image {editing ? '(leave empty to keep current)' : ''}</Label>
              {editing && !imageFile && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editing.imageUrl} alt="Current banner" className="mb-2 h-20 rounded border object-cover" />
              )}
              <label className="border-border hover:bg-muted/40 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm font-medium transition">
                <ImagePlus className="h-4 w-4" />
                {imageFile ? imageFile.name : 'Choose image (JPG, PNG, WebP, GIF — max 5MB)'}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" variant="gradient" onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Save changes' : 'Create banner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
