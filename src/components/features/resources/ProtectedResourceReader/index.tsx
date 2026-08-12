'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Maximize2, MessageSquareText, Minimize2, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { ProtectedResourceKind, ResourceMode } from '@/lib/resources/server';
import { ProtectedPdfViewer } from '@/components/features/resources/ProtectedPdfViewer';
import { ResourceComments } from '@/components/features/resources/ResourceComments';
import { isDarkThemeId } from '@/lib/constants/themes';

type PdfReaderThemePreference = 'auto' | 'dark' | 'light';

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
    throw new Error(json?.error || 'The resource could not be opened.');
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
  sourceUrl,
}: {
  open: boolean;
  onClose: () => void;
  kind: ProtectedResourceKind;
  resourceId: string;
  mode: ResourceMode;
  title: string;
  offlineBlob?: Blob | null;
  sourceUrl?: string | null;
}) {
  const { resolvedTheme, theme } = useTheme();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [resolvedBlob, setResolvedBlob] = useState<Blob | null>(offlineBlob || null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [pdfThemePreference, setPdfThemePreference] = useState<PdfReaderThemePreference>('auto');
  const [marking, setMarking] = useState(false);
  const [marked, setMarked] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);
  const activeAppTheme = resolvedTheme || theme || '';
  const autoMode: ResourceMode = isDarkThemeId(activeAppTheme) ? 'dark' : 'light';
  const effectiveMode: ResourceMode = pdfThemePreference === 'auto' ? autoMode : pdfThemePreference;

  useEffect(() => {
    if (!open) {
      setResolvedBlob(null);
      setLoadError(null);
      return;
    }
    if (offlineBlob) {
      setResolvedBlob(offlineBlob);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setResolvedBlob(null);
    setLoadError(null);
    void fetchProtectedResourceBlob({ kind, id: resourceId, mode: effectiveMode, purpose: 'reader' })
      .then((blob) => {
        if (!cancelled) setResolvedBlob(blob);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'The PDF could not be opened.');
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveMode, kind, offlineBlob, open, resourceId]);

  useEffect(() => {
    if (!open || !resolvedBlob) {
      setBlobUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(resolvedBlob);
    setBlobUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [resolvedBlob, open]);

  useEffect(() => {
    setCanFullscreen(typeof document !== 'undefined' && Boolean(document.documentElement.requestFullscreen));
    // Fullscreen the whole page (document.documentElement), not the reader's own `fixed inset-0`
    // div — requesting fullscreen on a fixed-position element fights the browser's fullscreen
    // top-layer on some Chromium/Windows builds, which is what caused the jitter/refresh-needed bug.
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!canFullscreen) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  const closeReader = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    onClose();
  };

  const markAsRead = async () => {
    if (marking || marked) return;
    setMarking(true);
    try {
      const response = await fetch('/api/resources/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, resourceId }),
      });
      if (!response.ok) throw new Error();
      setMarked(true);
      toast.success('Marked as read', { description: 'A practice test is ready when you are.' });
    } catch {
      toast.error('Could not save your reading progress.');
    } finally {
      setMarking(false);
    }
  };

  if (!open) return null;
  return (
    <div ref={readerRef} className="bg-background fixed inset-0 z-[230] flex h-dvh min-h-0 flex-col">
      <div className="border-border flex min-h-14 items-center justify-between gap-3 border-b px-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
          <p className="text-muted-foreground text-xs">PDF reader</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="border-border bg-muted/60 mr-1 flex rounded-full border p-0.5">
            {(['auto', 'dark', 'light'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPdfThemePreference(option)}
                className={`rounded-full px-1.5 py-1 text-[10px] font-semibold transition sm:px-2.5 sm:text-[11px] ${
                  pdfThemePreference === option ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={pdfThemePreference === option}
              >
                {option === 'auto' ? 'Auto' : option === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
          <Button
            variant={marked ? 'secondary' : 'ghost'}
            size="sm"
            onClick={markAsRead}
            disabled={marking || marked}
            className="gap-1.5 px-2 text-xs sm:px-3"
          >
            {marking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{marked ? 'Read' : 'Mark as read'}</span>
          </Button>
          <Button
            variant={showComments ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={() => setShowComments((value) => !value)}
            aria-label={showComments ? 'Hide PDF comments' : 'Show PDF comments'}
          >
            <MessageSquareText className="h-4 w-4" />
          </Button>
          {canFullscreen && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? 'Exit full screen' : 'Open full screen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={closeReader} aria-label="Close PDF reader">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 bg-slate-950">
        <div className="grid h-full min-h-0 grid-cols-1">
          <div className="relative min-h-0 min-w-0">
            {!blobUrl && !loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/75">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                <p className="text-sm">Loading offline file...</p>
              </div>
            )}
            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white/80">
                <p className="max-w-lg text-sm">{loadError}</p>
              </div>
            )}
            {blobUrl && <ProtectedPdfViewer url={blobUrl} title={title} className="h-full w-full" />}
          </div>
        </div>
        {showComments && (
          <div className="bg-background absolute inset-y-0 right-0 z-20 w-full max-w-md border-l shadow-2xl">
            <ResourceComments resourceKind={kind} resourceId={resourceId} />
          </div>
        )}
      </div>
    </div>
  );
}
