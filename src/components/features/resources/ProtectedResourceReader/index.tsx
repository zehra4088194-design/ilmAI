'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProtectedResourceKind, ResourceMode } from '@/lib/resources/server';
import { ResourcePreviewFrame } from '@/components/features/resources/ResourcePreviewFrame';

export async function fetchProtectedResourceResponse(input: {
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
  return response;
}

export async function fetchProtectedResourceBlob(input: {
  kind: ProtectedResourceKind;
  id: string;
  mode: ResourceMode;
  purpose: 'reader' | 'offline';
}) {
  return (await fetchProtectedResourceResponse(input)).blob();
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

  useEffect(() => {
    if (!open || !offlineBlob) {
      setBlobUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(offlineBlob);
    setBlobUrl(`${objectUrl}#toolbar=0&navpanes=0&statusbar=0&view=FitH`);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [offlineBlob, open]);

  if (!open) return null;
  return (
    <div className="bg-background fixed inset-0 z-[230] flex flex-col">
      <div className="border-border flex min-h-14 items-center justify-between gap-3 border-b px-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
          <p className="text-muted-foreground text-xs">In-app {mode === 'dark' ? 'dark' : 'light'} PDF reader</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close protected reader">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative min-h-0 flex-1 bg-slate-950">
        {offlineBlob && !blobUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/75">
            <Loader2 className="text-primary h-8 w-8 animate-spin" />
            <p className="text-sm">Offline file load ho rahi hai...</p>
          </div>
        )}
        {blobUrl && <iframe src={blobUrl} title={title} className="h-full w-full border-0" />}
        {!offlineBlob && (
          <ResourcePreviewFrame
            kind={kind}
            resourceId={resourceId}
            mode={mode}
            title={title}
            loading="eager"
            className="h-full w-full"
          />
        )}
      </div>
    </div>
  );
}
