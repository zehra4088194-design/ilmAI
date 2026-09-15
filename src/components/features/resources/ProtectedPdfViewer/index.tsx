'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  FileWarning,
  Gauge,
  Loader2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCw,
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { createPortal } from 'react-dom';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const AUTO_SCROLL_SPEEDS = [
  { label: '0.5x', pxPerSecond: 30 },
  { label: '1x', pxPerSecond: 60 },
  { label: '1.5x', pxPerSecond: 95 },
  { label: '2x', pxPerSecond: 140 },
  { label: '3x', pxPerSecond: 220 },
] as const;

const MOUNT_ROOT_MARGIN = '1400px 0px 1400px 0px';
const A4_ASPECT = 210 / 297;
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.25;
const BASE_WIDTH_SCALE = 0.7;

const MODE_BACKGROUND: Record<'dark' | 'light', string> = {
  dark: '/background-blue.png',
  light: '/background-light.png',
};

export function ProtectedPdfViewer({
  file: sourceFile,
  title,
  className,
  toolbarVisible = true,
  mode,
  onLoadError,
}: {
  file: Blob | string;
  title: string;
  className?: string;
  toolbarVisible?: boolean;
  mode?: 'dark' | 'light';
  onLoadError?: (message: string) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinchScaleRef = useRef<HTMLDivElement>(null);
  const speedButtonRef = useRef<HTMLButtonElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const zoomRef = useRef(DEFAULT_ZOOM);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [speedMenuPosition, setSpeedMenuPosition] = useState({ top: 0, left: 0 });
  const [mountedPages, setMountedPages] = useState<Set<number>>(() => new Set([1]));
  const [pageAspects, setPageAspects] = useState<Record<number, number>>({});
  const [toolbarAutoVisible, setToolbarAutoVisible] = useState(true);
  const toolbarHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let raf = 0;
    const updateWidth = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!frameRef.current) return;
        const nextWidth = Math.floor(frameRef.current.getBoundingClientRect().width);
        setContainerWidth((current) => (Math.abs(current - nextWidth) > 2 ? nextWidth : current));
      });
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(frame);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setPages(0);
    setPage(1);
    setZoom(DEFAULT_ZOOM);
    setRotation(0);
    setError(null);
    setAutoScrolling(false);
    setSpeedMenuOpen(false);
    setMountedPages(new Set([1]));
    setPageAspects({});
    pageRefs.current = [];
  }, [sourceFile]);

  // Continuous auto-scroll. The speed is measured in CSS pixels per second so every speed
  // remains predictable across page sizes and zoom levels.
  useEffect(() => {
    if (!autoScrolling) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const pxPerSecond = AUTO_SCROLL_SPEEDS[speedIndex]?.pxPerSecond ?? 60;
    const previousScrollBehavior = viewport.style.scrollBehavior;
    viewport.style.scrollBehavior = 'auto';
    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      viewport.scrollTop += pxPerSecond * dt;
      if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1) {
        setAutoScrolling(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    const stopOnUserScroll = () => setAutoScrolling(false);
    viewport.addEventListener('wheel', stopOnUserScroll, { passive: true });
    viewport.addEventListener('touchmove', stopOnUserScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      viewport.style.scrollBehavior = previousScrollBehavior;
      viewport.removeEventListener('wheel', stopOnUserScroll);
      viewport.removeEventListener('touchmove', stopOnUserScroll);
    };
  }, [autoScrolling, speedIndex]);

  // Keep the page counter in sync with the page occupying the largest visible area.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !pages) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.pageIndex);
          if (Number.isNaN(index)) continue;
          if (!best || entry.intersectionRatio > best.ratio) best = { index, ratio: entry.intersectionRatio };
        }
        if (best && best.ratio > 0) setPage(best.index + 1);
      },
      { root: viewport, threshold: [0.15, 0.35, 0.5, 0.75, 1] },
    );
    pageRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [pages]);

  // Windowed PDF rendering for long documents.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !pages) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const toMount: number[] = [];
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.pageIndex);
          if (!Number.isNaN(index)) toMount.push(index + 1);
        }
        if (!toMount.length) return;
        setMountedPages((current) => {
          const next = new Set(current);
          let changed = false;
          for (const pageNumber of toMount) {
            if (!next.has(pageNumber)) {
              next.add(pageNumber);
              changed = true;
            }
          }
          return changed ? next : current;
        });
      },
      { root: viewport, rootMargin: MOUNT_ROOT_MARGIN, threshold: 0 },
    );
    pageRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [pages]);

  // Reliable two-finger pinch zoom. We use a non-passive touch listener so the browser's own
  // page-level pinch never wins the gesture. During movement only a CSS transform is changed;
  // react-pdf is re-rendered once after release for the final sharp resolution.
  useEffect(() => {
    const viewport = viewportRef.current;
    const pinchTarget = pinchScaleRef.current;
    if (!viewport || !pinchTarget) return;

    let active = false;
    let startDistance = 0;
    let startZoom = DEFAULT_ZOOM;
    let liveZoom = DEFAULT_ZOOM;

    const distance = (touches: TouchList) => {
      const a = touches.item(0);
      const b = touches.item(1);
      if (!a || !b) return 0;
      return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    };

    const setOrigin = (touches: TouchList) => {
      const a = touches.item(0);
      const b = touches.item(1);
      if (!a || !b) return;
      const rect = pinchTarget.getBoundingClientRect();
      const x = (a.clientX + b.clientX) / 2 - rect.left + viewport.scrollLeft;
      const y = (a.clientY + b.clientY) / 2 - rect.top + viewport.scrollTop;
      pinchTarget.style.transformOrigin = `${x}px ${y}px`;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      active = true;
      startDistance = distance(event.touches);
      startZoom = zoomRef.current;
      liveZoom = startZoom;
      setOrigin(event.touches);
      pinchTarget.style.transition = 'none';
      pinchTarget.style.willChange = 'transform';
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!active || event.touches.length !== 2 || !startDistance) return;
      event.preventDefault();
      const ratio = distance(event.touches) / startDistance;
      liveZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, startZoom * ratio));
      pinchTarget.style.transform = `scale(${liveZoom / startZoom})`;
    };

    const finish = (event?: TouchEvent) => {
      if (!active) return;
      if (event && event.touches.length >= 2) return;
      active = false;
      startDistance = 0;
      const finalZoom = Number(liveZoom.toFixed(2));
      setZoom(finalZoom);
      requestAnimationFrame(() => {
        pinchTarget.style.transform = 'none';
        pinchTarget.style.willChange = 'auto';
      });
    };

    const onTouchEnd = (event: TouchEvent) => finish(event);
    const onTouchCancel = () => finish();

    viewport.addEventListener('touchstart', onTouchStart, { passive: false });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd, { passive: false });
    viewport.addEventListener('touchcancel', onTouchCancel, { passive: false });

    return () => {
      viewport.removeEventListener('touchstart', onTouchStart);
      viewport.removeEventListener('touchmove', onTouchMove);
      viewport.removeEventListener('touchend', onTouchEnd);
      viewport.removeEventListener('touchcancel', onTouchCancel);
    };
  }, []);

  const fittedWidth = Math.max(240, Math.min(containerWidth - 32, 1100)) * BASE_WIDTH_SCALE;
  const renderedWidth = Math.round(fittedWidth * zoom);
  const rotated90 = rotation === 90 || rotation === 270;
  const documentAspect = pageAspects[1] ?? A4_ASPECT;
  const pageNumbers = useMemo(() => Array.from({ length: pages }, (_, i) => i + 1), [pages]);
  const file = useMemo(() => sourceFile, [sourceFile]);

  const jumpToPage = (target: number) => {
    const next = Math.min(Math.max(1, target), pages || 1);
    setPage(next);
    const node = pageRefs.current[next - 1];
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        jumpToPage(Math.min(pages || 1, page + 1));
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        jumpToPage(Math.max(1, page - 1));
      } else if (event.key === '+' || event.key === '=') {
        setZoom((value) => Math.min(MAX_ZOOM, Number((value + 0.15).toFixed(2))));
      } else if (event.key === '-') {
        setZoom((value) => Math.max(MIN_ZOOM, Number((value - 0.15).toFixed(2))));
      }
    };
    frame.addEventListener('keydown', onKeyDown);
    return () => frame.removeEventListener('keydown', onKeyDown);
  }, [page, pages]);

  // Toolbar activity / auto-hide. An open speed menu keeps the toolbar alive.
  useEffect(() => {
    const frame = frameRef.current;
    const viewport = viewportRef.current;
    if (!frame || !viewport) return;
    const scheduleHide = () => {
      if (toolbarHideTimeoutRef.current) clearTimeout(toolbarHideTimeoutRef.current);
      toolbarHideTimeoutRef.current = setTimeout(() => setToolbarAutoVisible(false), 5000);
    };
    const onActivity = () => {
      setToolbarAutoVisible(true);
      scheduleHide();
    };
    scheduleHide();
    frame.addEventListener('mousemove', onActivity);
    viewport.addEventListener('touchstart', onActivity, { passive: true });
    viewport.addEventListener('scroll', onActivity, { passive: true });
    return () => {
      if (toolbarHideTimeoutRef.current) clearTimeout(toolbarHideTimeoutRef.current);
      frame.removeEventListener('mousemove', onActivity);
      viewport.removeEventListener('touchstart', onActivity);
      viewport.removeEventListener('scroll', onActivity);
    };
  }, []);

  // Position the speed menu with viewport coordinates and render it into body. This avoids every
  // possible clipping/stacking context problem from the PDF toolbar and also works in fullscreen.
  useEffect(() => {
    if (!speedMenuOpen) return;
    const updatePosition = () => {
      const button = speedButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = 104;
      const margin = 8;
      const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin));
      const top = Math.min(rect.bottom + 6, window.innerHeight - 6 - 5 * 32 - 12);
      setSpeedMenuPosition({ top: Math.max(margin, top), left });
    };
    const onDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (speedMenuRef.current?.contains(target) || speedButtonRef.current?.contains(target))) return;
      setSpeedMenuOpen(false);
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('pointerdown', onDocumentPointerDown);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('pointerdown', onDocumentPointerDown);
    };
  }, [speedMenuOpen]);

  const toolbarShown = toolbarVisible && (toolbarAutoVisible || speedMenuOpen);
  const selectedSpeed = AUTO_SCROLL_SPEEDS[speedIndex]?.label ?? '1x';

  const openSpeedMenu = () => {
    const button = speedButtonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      const width = 104;
      const margin = 8;
      const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin));
      const top = Math.min(rect.bottom + 6, window.innerHeight - 6 - 5 * 32 - 12);
      setSpeedMenuPosition({ top: Math.max(margin, top), left });
    }
    setToolbarAutoVisible(true);
    setSpeedMenuOpen((value) => !value);
  };

  return (
    <div
      ref={frameRef}
      tabIndex={-1}
      className={cn('text-slate-950 outline-none', !mode && 'bg-slate-200', className)}
      style={
        mode
          ? { backgroundImage: `url(${MODE_BACKGROUND[mode]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <div
          className={cn(
            'relative z-40 flex shrink-0 items-center justify-between gap-2 overflow-hidden border-slate-300 bg-white px-2 shadow-sm transition-all duration-300 ease-in-out sm:px-3',
            toolbarShown ? 'min-h-9 border-b opacity-100' : 'pointer-events-none min-h-0 border-b-0 py-0 opacity-0',
          )}
        >
          <div className="flex min-w-0 items-center gap-1">
            <input
              type="number"
              min={1}
              max={pages || 1}
              value={page}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isNaN(next)) setPage(Math.min(Math.max(1, next), pages || 1));
              }}
              onBlur={(event) => jumpToPage(Number(event.target.value) || 1)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') jumpToPage(Number((event.target as HTMLInputElement).value) || 1);
              }}
              disabled={!pages}
              className="focus:border-primary h-7 w-11 rounded border border-slate-300 bg-slate-50 text-center text-xs font-semibold tabular-nums focus:outline-none disabled:opacity-50"
              aria-label="Go to PDF page"
            />
            <span className="text-xs font-semibold tabular-nums text-slate-500 sm:text-sm">/ {pages || '—'}</span>
          </div>

          <p className="hidden min-w-0 flex-1 truncate px-3 text-center text-xs font-medium md:block">{title}</p>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant={autoScrolling ? 'secondary' : 'ghost'}
              size="icon-sm"
              onClick={() => setAutoScrolling((value) => !value)}
              disabled={!pages}
              aria-label={autoScrolling ? 'Pause auto-scroll' : 'Start auto-scroll'}
              title={autoScrolling ? 'Pause auto-scroll' : 'Start auto-scroll'}
            >
              {autoScrolling ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <button
              ref={speedButtonRef}
              type="button"
              onClick={openSpeedMenu}
              aria-haspopup="menu"
              aria-expanded={speedMenuOpen}
              aria-label={`Auto-scroll speed: ${selectedSpeed}`}
              title={`Auto-scroll speed: ${selectedSpeed}`}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95',
                speedMenuOpen ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Gauge className="h-4 w-4" />
            </button>

            <div className="mx-1 h-5 w-px bg-slate-200" />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setZoom((value) => Math.max(MIN_ZOOM, Number((value - 0.15).toFixed(2))))}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="hidden w-11 text-center text-xs tabular-nums sm:inline">{Math.round(zoom * 100)}%</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setZoom((value) => Math.min(MAX_ZOOM, Number((value + 0.15).toFixed(2))))}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setRotation((value) => (value + 90) % 360)}
              aria-label="Rotate page"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="min-h-0 flex-1 touch-pan-x touch-pan-y overflow-auto overscroll-contain scroll-smooth p-3 [scrollbar-gutter:stable] sm:p-6"
        >
          {error ? (
            <div className="mx-auto flex min-h-64 max-w-md flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-sm">
              <FileWarning className="mb-3 h-9 w-9 text-amber-600" />
              <p className="font-semibold">The PDF could not be loaded</p>
              <p className="mt-2 text-sm text-slate-600">{error}</p>
            </div>
          ) : containerWidth > 0 ? (
            <div ref={pinchScaleRef} className="mx-auto w-max">
              <Document
                file={file}
                loading={
                  <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-600">
                    <Loader2 className="text-primary h-8 w-8 animate-spin" />
                    <p className="text-sm font-medium">Loading the PDF...</p>
                  </div>
                }
                onLoadSuccess={({ numPages }) => {
                  setPages(numPages);
                  setPage(1);
                }}
                onLoadError={(loadError) => {
                  console.error('Protected PDF render failed:', loadError);
                  const message = 'The response is not a valid PDF, or the connection was interrupted. Reopen the file and try again.';
                  if (onLoadError) onLoadError(message);
                  else setError(message);
                }}
                className="mx-auto flex w-max max-w-none flex-col items-center gap-5"
              >
                {pageNumbers.map((pageNumber) => {
                  const measuredAspect = pageAspects[pageNumber] ?? documentAspect;
                  const effectiveAspect = rotated90 ? 1 / measuredAspect : measuredAspect;
                  const placeholderHeight = Math.max(200, Math.round(renderedWidth / effectiveAspect));
                  return (
                    <div
                      key={pageNumber}
                      ref={(node) => {
                        pageRefs.current[pageNumber - 1] = node;
                      }}
                      data-page-index={pageNumber - 1}
                      className="animate-in fade-in group relative w-max duration-300"
                    >
                      {mountedPages.has(pageNumber) ? (
                        <Page
                          pageNumber={pageNumber}
                          width={renderedWidth}
                          rotate={rotation}
                          renderAnnotationLayer={false}
                          renderTextLayer
                          onLoadSuccess={(loadedPage) => {
                            const [x0, y0, x1, y1] = loadedPage.view;
                            const w = x1 - x0;
                            const h = y1 - y0;
                            if (w <= 0 || h <= 0) return;
                            const aspect = w / h;
                            setPageAspects((current) => (current[pageNumber] === aspect ? current : { ...current, [pageNumber]: aspect }));
                          }}
                          loading={
                            <div
                              className="flex w-full animate-pulse items-center justify-center rounded-sm bg-white ring-1 ring-black/5"
                              style={{ width: renderedWidth, height: placeholderHeight }}
                            >
                              <Loader2 className="text-primary h-7 w-7 animate-spin" />
                            </div>
                          }
                          className="overflow-hidden rounded-sm bg-white shadow-xl ring-1 ring-black/5"
                        />
                      ) : (
                        <div
                          className="rounded-sm bg-white ring-1 ring-black/5"
                          style={{ width: renderedWidth, height: placeholderHeight }}
                        />
                      )}
                      <span className="pointer-events-none absolute -top-2 left-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
                        {pageNumber}
                      </span>
                    </div>
                  );
                })}
              </Document>
            </div>
          ) : null}
        </div>

        {autoScrolling && (
          <div className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-300 bg-white/95 px-3 py-1 text-[11px] font-medium text-slate-500">
            <ChevronDown className="text-primary h-3.5 w-3.5 animate-bounce" />
            Auto-scrolling at {AUTO_SCROLL_SPEEDS[speedIndex]?.label} — scroll or tap pause to stop
          </div>
        )}
      </div>

      {speedMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={speedMenuRef}
            role="menu"
            aria-label="Auto-scroll speed"
            style={{ position: 'fixed', top: speedMenuPosition.top, left: speedMenuPosition.left }}
            className="z-[99999] w-[104px] rounded-lg border border-slate-200 bg-white p-1.5 text-slate-950 shadow-2xl ring-1 ring-black/5"
          >
            {AUTO_SCROLL_SPEEDS.map((speed, index) => (
              <button
                key={speed.label}
                type="button"
                role="menuitemradio"
                aria-checked={index === speedIndex}
                onClick={() => {
                  setSpeedIndex(index);
                  setSpeedMenuOpen(false);
                  if (autoScrolling) setAutoScrolling(true);
                }}
                className={cn(
                  'flex h-8 w-full items-center justify-center rounded-md px-2 text-xs font-medium outline-none transition-colors',
                  index === speedIndex ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                {speed.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
