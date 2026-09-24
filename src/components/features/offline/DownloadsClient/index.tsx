'use client';

import { useEffect, useState } from 'react';
import { Eye, FileText, HardDrive, Library, Loader2, Trash2, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  clearOfflineResources,
  deleteOfflineResource,
  getOfflineResourceBlob,
  getOfflineStorageEstimate,
  listOfflineResources,
  type OfflineResource,
} from '@/lib/offline/resources';
import { ProtectedResourceReader } from '@/components/features/resources/ProtectedResourceReader';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function DownloadsClient({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<OfflineResource[]>([]);
  const [active, setActive] = useState<{ item: OfflineResource; blob?: Blob } | null>(null);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);

  const refresh = async () => {
    try {
      const stored = await listOfflineResources();
      setItems(stored.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
    } catch {
      setItems([]);
    }
    setStorageEstimate(await getOfflineStorageEstimate().catch(() => null));
  };

  useEffect(() => {
    void navigator.storage?.persist?.();
    void refresh();
  }, []);

  const clear = async () => {
    await clearOfflineResources();
    setActive(null);
    await refresh();
    toast.success('Saved links cleared.');
  };

  const remove = async (item: OfflineResource) => {
    await deleteOfflineResource(item.key);
    if (active?.item.key === item.key) setActive(null);
    await refresh();
    toast.success('Saved item removed.');
  };

  const openOffline = async (item: OfflineResource) => {
    setOpeningKey(item.key);
    try {
      if (item.sourceUrl) {
        throw new Error('This older saved link must be removed and saved again for real offline access.');
      }
      setActive({ item, blob: await getOfflineResourceBlob(item) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The saved file could not be opened.');
    } finally {
      setOpeningKey(null);
    }
  };

  return (
    <div className={embedded ? 'space-y-4' : 'mx-auto w-full max-w-5xl space-y-6 px-1 sm:px-0'}>
      {!embedded && (
        <div>
          <Badge variant="secondary" className="mb-3">
            Saved Library
          </Badge>
          <h1 className="text-2xl font-bold sm:text-3xl">Downloads</h1>
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
            Save useful books, notes, and papers in app-private storage. They stay inside Ilm AI and are not exported
            to the device Downloads folder.
          </p>
        </div>
      )}

      {storageEstimate && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <HardDrive className="text-primary h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">
                  {formatBytes(storageEstimate.usage)} used of {formatBytes(storageEstimate.quota)} available
                </p>
                <p className="text-muted-foreground text-sm">
                  Shared across this app's offline storage (Downloads, cached pages, and app data) in this browser
                </p>
              </div>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{
                  width: `${Math.min(100, storageEstimate.quota ? (storageEstimate.usage / storageEstimate.quota) * 100 : 0)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <Library className="text-primary h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">
                {items.length} saved item{items.length === 1 ? '' : 's'}
              </p>
              <p className="text-muted-foreground text-sm">Stored in this app and browser</p>
            </div>
          </div>
          <Button variant="outline" onClick={clear} disabled={!items.length} className="w-full sm:w-auto">
            <Trash2 className="h-4 w-4" />
            Clear all
          </Button>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
            <WifiOff className="text-muted-foreground/50 mb-3 h-10 w-10" />
            <p className="font-semibold">No saved files yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Use &quot;Save in app&quot; on Library or Past Papers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.key}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.mode} version | {new Date(item.savedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:shrink-0">
                  <Button
                    variant="gradient"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => void openOffline(item)}
                    disabled={openingKey === item.key}
                  >
                    {openingKey === item.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    Open
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => void remove(item)} aria-label="Remove offline file">
                    <Trash2 className="text-destructive h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {active && (
        <ProtectedResourceReader
          open
          onClose={() => setActive(null)}
          kind={active.item.kind}
          resourceId={active.item.resourceId}
          mode={active.item.mode}
          title={active.item.title}
          offlineBlob={active.blob}
          sourceUrl={active.item.sourceUrl}
        />
      )}
    </div>
  );
}
