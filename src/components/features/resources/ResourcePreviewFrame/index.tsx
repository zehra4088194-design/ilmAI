'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import type { ProtectedResourceKind, ResourceMode } from '@/lib/resources/server';
import { cn } from '@/lib/utils/cn';

export function getResourcePreviewPath({
  kind,
  resourceId,
  mode,
}: {
  kind: ProtectedResourceKind;
  resourceId: string;
  mode: ResourceMode;
}) {
  const params = new URLSearchParams({ kind, id: resourceId, mode });
  return `/api/resources/preview?${params.toString()}`;
}

export function ResourcePreviewFrame({
  kind,
  resourceId,
  mode,
  title,
  className,
  loading = 'lazy',
}: {
  kind: ProtectedResourceKind;
  resourceId: string;
  mode: ResourceMode;
  title: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}) {
  const src = getResourcePreviewPath({ kind, resourceId, mode });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => setLoaded(false), [src]);

  return (
    <div className={cn('relative overflow-hidden bg-slate-100', className)}>
      {!loaded && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-2 text-slate-500">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
            <FileText className="h-5 w-5" />
            <Loader2 className="text-primary absolute -right-1 -bottom-1 h-4 w-4 animate-spin" />
          </span>
          <p className="text-xs font-medium">PDF preview load ho raha hai...</p>
        </div>
      )}
      <iframe
        key={src}
        src={src}
        title={title}
        loading={loading}
        allow="autoplay; fullscreen"
        allowFullScreen
        onLoad={() => setLoaded(true)}
        className={cn('relative z-[1] h-full w-full border-0 transition-opacity', loaded ? 'opacity-100' : 'opacity-0')}
      />
      <div
        aria-hidden="true"
        title="Open in Drive is disabled; read the file inside ilm AI"
        className="absolute top-0 right-0 z-10 h-14 w-[4.5rem] cursor-not-allowed"
      />
    </div>
  );
}
