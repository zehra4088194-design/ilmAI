import type { ProtectedResourceKind, ResourceMode } from '@/lib/resources/server';
import { cn } from '@/lib/utils/cn';
import { getEmbeddableFilePreviewUrl } from '@/lib/utils/filePreview';

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
  const simplePreviewUrl = getEmbeddableFilePreviewUrl(src) || src;

  return (
    <iframe
      key={simplePreviewUrl}
      src={simplePreviewUrl}
      title={title}
      loading={loading}
      allow="fullscreen"
      className={cn('h-full w-full border-0 bg-white', className)}
    />
  );
}
