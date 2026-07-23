'use client';

import { useEffect, useState } from 'react';
import { DownloadCloud, Eye, FileText, HardDriveDownload, Loader2, Trash2, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  clearOfflineResources,
  deleteOfflineResource,
  getOfflineResourceBlob,
  listOfflineResources,
  type OfflineResource,
} from '@/lib/offline/resources';
import { ProtectedResourceReader } from '@/components/features/resources/ProtectedResourceReader';

function safeDownloadName(title: string, mimeType: string) {
  const base = title.replace(/[^\w\s.-]+/g, '').trim().replace(/\s+/g, '-') || 'ilm-ai-file';
  const extension = mimeType.includes('pdf') ? 'pdf' : 'bin';
  return base.toLowerCase().endsWith(`.${extension}`) ? base : `${base}.${extension}`;
}

export function DownloadsClient({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<OfflineResource[]>([]);
  const [active, setActive] = useState<{ item: OfflineResource; blob: Blob } | null>(null);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [exportingKey, setExportingKey] = useState<string | null>(null);
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
    toast.success('Offline files cleared.');
  };

  const remove = async (item: OfflineResource) => {
    await deleteOfflineResource(item.key);
    if (active?.item.key === item.key) setActive(null);
    await refresh();
    toast.success('Offline file removed.');
  };

  const openOffline = async (item: OfflineResource) => {
    setOpeningKey(item.key);
    try {
      const blob = await getOfflineResourceBlob(item);
      setActive({ item, blob });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The offline file could not be opened.');
    } finally {
      setOpeningKey(null);
    }
  };

  const exportFile = async (item: OfflineResource) => {
    setExportingKey(item.key);
    try {
      const blob = await getOfflineResourceBlob(item);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = safeDownloadName(item.title, item.mimeType);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The file could not be saved to this device.');
    } finally {
      setExportingKey(null);
    }
  };

  return (
    <div className={embedded ? 'space-y-4' : 'mx-auto w-full max-w-5xl space-y-6 px-1 sm:px-0'}>
      {!embedded && (
        <div>
          <Badge variant="secondary" className="mb-3">
            Offline Learning
          </Badge>
          <h1 className="text-2xl font-bold sm:text-3xl">Downloads</h1>
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
            Pro and Elite files are saved for offline reading inside the app. You can also export a saved file to this
            device when needed.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <HardDriveDownload className="text-primary h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold">
                {items.length} saved item{items.length === 1 ? '' : 's'}
              </p>
              <p className="text-muted-foreground text-sm">{storageEstimate}</p>
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
            <p className="font-semibold">No app downloads yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Use &quot;Save in app for offline&quot; on Library or Past Papers.
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
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:flex sm:shrink-0">
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => void exportFile(item)}
                    disabled={exportingKey === item.key}
                  >
                    {exportingKey === item.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <DownloadCloud className="h-3.5 w-3.5" />
                    )}
                    Export
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
        />
      )}
    </div>
  );
}
