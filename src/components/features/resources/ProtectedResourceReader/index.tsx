'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProtectedResourceKind, ResourceMode } from '@/lib/resources/server';

export async function fetchProtectedResourceBlob(input: {
  kind: ProtectedResourceKind;
  id: string;
  mode: ResourceMode;
  purpose: 'reader' | 'offline';
}) {
  const response = await fetch('/api/resources/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new Error(json?.error || 'Resource open nahi ho saka.');
  }
  return response.blob();
}

export function ProtectedResourceReader({
  open,
  onClose,
  kind,
  resourceId,
  mode,
  title,
  offlineBlob,
}: {
  open: boolean;
  onClose: () => void;
  kind: ProtectedResourceKind;
  resourceId: string;
  mode: ResourceMode;
  title: string;
  offlineBlob?: Blob | null;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    let objectUrl = '';
    setError(null);
    setBlobUrl(null);
    const load = async () => {
      try {
        const blob =
          offlineBlob || (await fetchProtectedResourceBlob({ kind, id: resourceId, mode, purpose: 'reader' }));
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(`${objectUrl}#toolbar=0&navpanes=0&statusbar=0&view=FitH`);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Resource open nahi ho saka.');
      }
    };
    void load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [kind, mode, offlineBlob, open, resourceId]);

  if (!open) return null;
  return (
    <div
      className="bg-background fixed inset-0 z-[230] flex flex-col"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="border-border flex min-h-14 items-center justify-between gap-3 border-b px-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Protected in-app reader
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close protected reader">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative min-h-0 flex-1 bg-slate-950">
        {!blobUrl && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/75">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-sm">Protected file load ho rahi hai...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-300">
            {error}
          </div>
        )}
        {blobUrl && (
          <iframe
            src={blobUrl}
            title={title}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    </div>
  );
}
