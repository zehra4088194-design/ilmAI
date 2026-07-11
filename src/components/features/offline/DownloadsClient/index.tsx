'use client';

import { useEffect, useState } from 'react';
import { HardDriveDownload, Trash2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type OfflineItem = { id: string; title: string; url?: string; savedAt: string };

export function DownloadsClient() {
  const [items, setItems] = useState<OfflineItem[]>([]);
  const [storageEstimate, setStorageEstimate] = useState<string>('Calculating...');

  useEffect(() => {
    const raw = localStorage.getItem('ilm-ai-offline-items');
    setItems(raw ? JSON.parse(raw) : []);
    navigator.storage?.estimate?.().then((estimate) => {
      const used = Math.round((estimate.usage || 0) / 1024 / 1024);
      const quota = Math.round((estimate.quota || 0) / 1024 / 1024);
      setStorageEstimate(`${used}MB used${quota ? ` of ${quota}MB` : ''}`);
    });
  }, []);

  const clear = async () => {
    localStorage.removeItem('ilm-ai-offline-items');
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.includes('ilm-ai')).map((key) => caches.delete(key)));
    }
    setItems([]);
    toast.success('Offline cache clear ho gaya.');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3">Offline Learning</Badge>
        <h1 className="text-2xl font-bold">Downloads</h1>
        <p className="text-muted-foreground">Explicitly downloaded notes, PDFs aur resources yahan offline access ke liye list honge.</p>
      </div>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <HardDriveDownload className="h-5 w-5 text-violet-400" />
            <div>
              <p className="font-semibold">{items.length} downloaded items</p>
              <p className="text-sm text-muted-foreground">{storageEstimate}</p>
            </div>
          </div>
          <Button variant="outline" onClick={clear}><Trash2 className="h-4 w-4" />Clear cache</Button>
        </CardContent>
      </Card>
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
            <WifiOff className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold">No downloads yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Library resources par Download for offline button use karo.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(item.savedAt).toLocaleString()}</p>
                </div>
                {item.url && <Button asChild variant="outline" size="sm"><a href={item.url}>Open</a></Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
