'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { CheckCircle2, Loader2, Maximize2, MessageSquareText, Minimize2, RefreshCw, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { ProtectedResourceKind, ResourceMode } from '@/lib/resources/server';
import { ResourceComments } from '@/components/features/resources/ResourceComments';
import { isDarkThemeId } from '@/lib/constants/themes';

// react-pdf's module scope touches browser-only globals (DOMMatrix, etc.) through pdfjs — fine in
// the browser, but Next still evaluates 'use client' components once during SSR, which crashed
// with "ReferenceError: DOMMatrix is not defined" every time this reader mounted. ssr: false keeps
// the whole pdfjs stack out of the server bundle entirely.
const ProtectedPdfViewer = dynamic(
  () => import('@/components/features/resources/ProtectedPdfViewer').then((mod) => mod.ProtectedPdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-950 text-white/75">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-sm">Loading the PDF...</p>
      </div>
    ),
  },
);

type PdfReaderThemePreference = 'auto' | 'dark' | 'light';

// Older/embedded WebViews (the Android app shell in particular) only expose the vendor-prefixed
// Fullscreen API, or none at all. Reading through this small shim once keeps every call site
// below from having to branch on browser quirks.
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function getFullscreenElement() {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement || doc.webkitFullscreenElement || null;
}

function requestFullscreen(el: HTMLElement): Promise<void> {
  const target = el as FullscreenElement;
  if (target.requestFullscreen) return target.requestFullscreen();
  if (target.webkitRequestFullscreen) return Promise.resolve(target.webkitRequestFullscreen());
  return Promise.reject(new Error('Fullscreen is not supported in this browser.'));
}

function exitFullscreen(): Promise<void> {
  const doc = document as FullscreenDocument;
  if (doc.exitFullscreen) return doc.exitFullscreen();
  if (doc.webkitExitFullscreen) return Promise.resolve(doc.webkitExitFullscreen());
  return Promise.resolve();
}

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
  const blob = await (await fetchProtectedResourceResponse(input)).blob();
  const signature = await blob
    .slice(0, 5)
    .text()
    .catch(() => '');
  if (signature !== '%PDF-') {
    throw new Error('The stored file is not a valid PDF. Check the resource file URL or uploaded object.');
  }
  return blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
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
  const [resolvedBlob, setResolvedBlob] = useState<Blob | null>(offlineBlob || null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [pdfThemePreference, setPdfThemePreference] = useState<PdfReaderThemePreference>('auto');
  const [marking, setMarking] = useState(false);
  const [marked, setMarked] = useState(false);
  // Fullscreen auto-hide: both toolbars (this header, and ProtectedPdfViewer's own page/zoom bar)
  // fade out after a couple of idle seconds so only the page fills the screen, then reappear on
  // the next mouse/touch activity. Controls always stay visible outside fullscreen.
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    // One silent retry on transient network drops (the "Signed object fetch failed" /
    // intermittent-load class of bug) before surfacing an error — most of those failures are a
    // single dropped connection to storage, not a missing file, and clear themselves up
    // immediately on a second attempt.
    void fetchProtectedResourceBlob({ kind, id: resourceId, mode: effectiveMode, purpose: 'reader' })
      .catch(() => fetchProtectedResourceBlob({ kind, id: resourceId, mode: effectiveMode, purpose: 'reader' }))
      .then((blob) => {
        if (!cancelled) setResolvedBlob(blob);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'The PDF could not be opened.');
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveMode, kind, offlineBlob, open, resourceId, retryToken]);

  useEffect(() => {
    setCanFullscreen(
      typeof document !== 'undefined' &&
        Boolean(document.documentElement.requestFullscreen || (document.documentElement as FullscreenElement).webkitRequestFullscreen),
    );
    // Fullscreen the whole page (document.documentElement), not the reader's own `fixed inset-0`
    // div — requesting fullscreen on a fixed-position element fights the browser's fullscreen
    // top-layer on some Chromium/Windows builds, which is what caused the jitter/refresh-needed bug.
    const handleFullscreenChange = () => setIsFullscreen(Boolean(getFullscreenElement()));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
    };
  }, []);

  const scheduleControlsHide = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setControlsVisible(false), 1500);
  }, []);

  // Entering fullscreen starts the idle-hide countdown; exiting it cancels any pending hide and
  // forces the toolbars back on (so the reader never opens back up into a still-faded state).
  useEffect(() => {
    if (!isFullscreen) {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      setControlsVisible(true);
      return;
    }
    scheduleControlsHide();
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isFullscreen, scheduleControlsHide]);

  // Any pointer activity while fullscreen brings the toolbars back and restarts the idle timer —
  // a no-op outside fullscreen since controls are always visible there anyway.
  const handleReaderActivity = useCallback(() => {
    if (!isFullscreen) return;
    setControlsVisible(true);
    scheduleControlsHide();
  }, [isFullscreen, scheduleControlsHide]);

  const holdControlsVisible = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setControlsVisible(true);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!canFullscreen) return;
    try {
      if (getFullscreenElement()) {
        await exitFullscreen();
      } else {
        await requestFullscreen(document.documentElement);
      }
    } catch (error) {
      // The reader is already a full-viewport overlay regardless of whether the browser grants
      // true Fullscreen — this only fails to hide the browser chrome, it never breaks reading.
      console.error('Fullscreen toggle failed:', error);
      toast.error('Full screen is blocked by the browser here. The reader still fills the screen.');
    }
  }, [canFullscreen]);

  const closeReader = () => {
    if (getFullscreenElement()) void exitFullscreen().catch(() => {});
    onClose();
  };

  const retryLoad = () => {
    setLoadError(null);
    setRetryToken((value) => value + 1);
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

  const toolbarsVisible = !isFullscreen || controlsVisible;

  // Portal to document.body: this reader is a `fixed inset-0` full-viewport overlay, but every
  // caller mounts it inside a resource Card that has a `hover:-translate-y-*`/scale transform.
  // Any CSS transform on an ancestor creates a new containing block for `position: fixed`
  // descendants, so without the portal the "fullscreen" reader was sized/positioned relative to
  // that small card instead of the viewport the instant it (or the mouse) triggered the hover —
  // that's what caused the rapid full-size/card-size flicker as the pointer moved near the card.
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => setPortalReady(true), []);

  if (!open || !portalReady) return null;
  return createPortal(
    <div
      ref={readerRef}
      className="bg-background fixed inset-0 z-[230] flex h-dvh min-h-0 flex-col"
      onMouseMove={handleReaderActivity}
      onTouchStart={handleReaderActivity}
    >
      <div
        className={`border-border flex items-center justify-between gap-3 overflow-hidden border-b px-3 transition-all duration-300 ease-in-out sm:px-5 ${
          toolbarsVisible ? 'min-h-14 opacity-100' : 'pointer-events-none min-h-0 border-b-0 py-0 opacity-0'
        }`}
        onMouseEnter={holdControlsVisible}
        onMouseLeave={() => {
          if (isFullscreen) scheduleControlsHide();
        }}
      >
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
            {!resolvedBlob && !loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/75">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                <p className="text-sm">Loading the PDF...</p>
              </div>
            )}
            {loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white/80">
                <p className="max-w-lg text-sm">{loadError}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={retryLoad} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try again
                  </Button>
                  {sourceUrl && (
                    <Button type="button" variant="outline" size="sm" asChild>
                      <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                        Open original file
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}
            {resolvedBlob && (
              <ProtectedPdfViewer
                file={resolvedBlob}
                title={title}
                className="h-full w-full"
                toolbarVisible={toolbarsVisible}
              />
            )}
          </div>
        </div>
        {showComments && (
          <div className="bg-background absolute inset-y-0 right-0 z-20 w-full max-w-md border-l shadow-2xl">
            <ResourceComments resourceKind={kind} resourceId={resourceId} />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
