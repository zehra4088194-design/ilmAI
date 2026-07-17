'use client';

import { useEffect, useState } from 'react';
import { Eye, FileText, HardDriveDownload, Loader2, Trash2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  clearOfflineResources,
  deleteOfflineResource,
  getOfflineResourceBlob,
  listOfflineResources,
  type OfflineResource,
} from '@/lib/offline/resources';
import { ProtectedResourceReader } from '@/components/features/resources/ProtectedResourceReader';

export function DownloadsClient({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<OfflineResource[]>([]);
  const [active, setActive] = useState<{ item: OfflineResource; blob: Blob } | null>(null);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [storageEstimate, setStorageEstimate] = useState('Calculating...');

  const refresh = async () => {
    try {
      const stored = await listOfflineResources();
      setItems(stored.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
    } catch {
      setItems([]);
    }
    navigator.storage?.estimate?.().then((estimate) => {
      const used = Math.round((estimate.usage || 0) / 1024 / 1024);
      const quota = Math.round((estimate.quota || 0) / 1024 / 1024);
      setStorageEstimate(`${used}MB used${quota ? ` of ${quota}MB` : ''}`);
    });
  };

  useEffect(() => {
    void navigator.storage?.persist?.();
    void refresh();
  }, []);

  const clear = async () => {
    await clearOfflineResources();
    setItems([]);
    setActive(null);
    toast.success('App-only offline files clear ho gayi hain.');
  };

  const remove = async (item: OfflineResource) => {
    await deleteOfflineResource(item.key);
    if (active?.item.key === item.key) setActive(null);
    await refresh();
    toast.success('Offline file remove ho gayi.');
  };

  const openOffline = async (item: OfflineResource) => {
    setOpeningKey(item.key);
    try {
      const blob = await getOfflineResourceBlob(item);
      setActive({ item, blob });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Offline file open nahi ho saki.');
    } finally {
      setOpeningKey(null);
    }
  };

  return (
    <div className={embedded ? 'space-y-4' : 'mx-auto max-w-5xl space-y-6'}>
      {!embedded && (
        <div>
          <Badge variant="secondary" className="mb-3">
            Offline Learning
          </Badge>
          <h1 className="text-2xl font-bold">Downloads</h1>
          <p className="text-muted-foreground">
            Pro/Elite files app ke private storage mein save hoti hain, normal device downloads mein nahi.
          </p>
        </div>
      )}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <HardDriveDownload className="text-primary h-5 w-5" />
            <div>
              <p className="font-semibold">
                {items.length} saved item{items.length === 1 ? '' : 's'}
              </p>
              <p className="text-muted-foreground text-sm">{storageEstimate}</p>
            </div>
          </div>
          <Button variant="outline" onClick={clear} disabled={!items.length}>
            <Trash2 className="h-4 w-4" />
            Clear all
          </Button>
        </CardContent>
      </Card>
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
            <WifiOff className="text-muted-foreground/50 mb-3 h-10 w-10" />
            <p className="font-semibold">No app downloads yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Library ya Past Papers par “Save in app for offline” use karo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.key}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
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
                <div className="flex gap-2">
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => openOffline(item)}
                    disabled={openingKey === item.key}
                  >
                    {openingKey === item.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    Open
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => remove(item)} aria-label="Remove offline file">
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
        />
      )}
    </div>
  );
}
