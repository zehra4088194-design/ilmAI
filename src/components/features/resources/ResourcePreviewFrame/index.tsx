import dynamic from 'next/dynamic';
import { FileText, Loader2 } from 'lucide-react';
import type { ProtectedResourceKind, ResourceMode } from '@/lib/resources/server';
import { cn } from '@/lib/utils/cn';

const ProtectedPdfViewer = dynamic(
  () => import('@/components/features/resources/ProtectedPdfViewer').then((module) => module.ProtectedPdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500">
        <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
          <FileText className="h-5 w-5" />
          <Loader2 className="text-primary absolute -right-1 -bottom-1 h-4 w-4 animate-spin" />
        </span>
        <p className="text-xs font-medium">Preparing the PDF viewer...</p>
      </div>
    ),
  }
);

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
  sourceUrl,
}: {
  kind: ProtectedResourceKind;
  resourceId: string;
  mode: ResourceMode;
  title: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  sourceUrl?: string;
}) {
  const src = sourceUrl || getResourcePreviewPath({ kind, resourceId, mode });
  void loading;

  return (
    <ProtectedPdfViewer key={src} url={src} title={title} className={cn('h-full w-full', className)} />
  );
}
