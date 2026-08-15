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

// How far outside the visible viewport a page is allowed to mount its real canvas. Generous
// enough that continuous scrolling never shows a blank flash, small enough that a 100+ page
// document never tries to rasterize more than a handful of pages at once.
const MOUNT_ROOT_MARGIN = '1400px 0px 1400px 0px';
const A4_ASPECT = 210 / 297; // width / height fallback until a page tells us its real shape

export function ProtectedPdfViewer({
  file: sourceFile,
  title,
  className,
}: {
  // Accepts the already-downloaded Blob directly, not a blob: object URL. Handing pdf.js a
  // blob: URL string makes it treat the document as a network resource and issue its own
  // internal (ranged) fetch against that URL — which intermittently comes back
  // "Unexpected server response (0)" and reads to the user as a random, unexplained load
  // failure. The whole file is already in memory by the time this component sees it, so there's
  // no reason to round-trip it through a URL at all.
  file: Blob | string;
  title: string;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [mountedPages, setMountedPages] = useState<Set<number>>(() => new Set([1]));
  // Per-page aspect ratio (width/height), keyed by 1-based page number. A single global aspect
  // (taken from page 1 only) used to size every placeholder — mixed-orientation PDFs (a
  // landscape diagram page inside an otherwise portrait document) would then swap from a
  // wrongly-sized placeholder to the real canvas the moment that page mounted, snapping the
  // scroll position and reading as a "vibration"/jitter glitch while scrolling. Tracking each
  // page's own measured aspect (falling back to the document default only until measured) keeps
  // every placeholder-to-canvas swap the same height, so nothing shifts under the reader.
  const [pageAspects, setPageAspects] = useState<Record<number, number>>({});

  // Auto-load: the viewer starts pulling the document the moment a url is handed to it —
  // there is no "open" step for the caller to trigger beyond mounting/passing the url.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    // Coalesce rapid-fire ResizeObserver ticks into one width update per animation frame.
    // Without this, entering/exiting fullscreen (which resizes the viewport repeatedly while the
    // browser chrome animates in/out) re-renders every page on each tick and the whole document
    // visibly shakes; rAF-batching settles it to a single clean re-layout once the resize stops.
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
    setZoom(1);
    setRotation(0);
    setError(null);
    setAutoScrolling(false);
    setMountedPages(new Set([1]));
    setPageAspects({});
    pageRefs.current = [];
  }, [sourceFile]);

  // Continuous auto-scroll, like a teleprompter: advances the viewport at a steady
  // pixel-per-second rate and stops itself at the bottom or when the user scrolls manually.
  useEffect(() => {
    if (!autoScrolling) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const pxPerSecond = AUTO_SCROLL_SPEEDS[speedIndex]?.pxPerSecond ?? 60;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
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
      viewport.removeEventListener('wheel', stopOnUserScroll);
      viewport.removeEventListener('touchmove', stopOnUserScroll);
    };
  }, [autoScrolling, speedIndex]);

  // Track which page is centered in view so the page counter stays accurate during
  // continuous scrolling (both manual and auto).
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !pages) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.pageIndex);
          if (Number.isNaN(index)) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { index, ratio: entry.intersectionRatio };
          }
        }
        if (best && best.ratio > 0) setPage(best.index + 1);
      },
      { root: viewport, threshold: [0.15, 0.35, 0.5, 0.75, 1] },
    );
    pageRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [pages]);

  // Windowed rendering: only pages within MOUNT_ROOT_MARGIN of the viewport ever get a real
  // <Page> canvas. Everything else stays a lightweight, correctly-sized placeholder — this is
  // what keeps a long PDF from freezing the tab while still feeling like it "just loaded".
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !pages) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const toMount: number[] = [];
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.pageIndex);
          if (Number.isNaN(index)) continue;
          toMount.push(index + 1);
        }
        if (toMount.length) {
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
        }
      },
      { root: viewport, rootMargin: MOUNT_ROOT_MARGIN, threshold: 0 },
    );
    pageRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [pages]);

  const fittedWidth = Math.max(240, Math.min(containerWidth - 32, 1100));
  const renderedWidth = Math.round(fittedWidth * zoom);
  const rotated90 = rotation === 90 || rotation === 270;
  const documentAspect = pageAspects[1] ?? A4_ASPECT;
  const pageNumbers = useMemo(() => Array.from({ length: pages }, (_, i) => i + 1), [pages]);
  // react-pdf reloads the whole document whenever the `file` prop's object identity changes (it
  // only warns "consider memoizing", it doesn't dedupe for you). A Blob's identity is already
  // stable across re-renders as long as the caller isn't creating a new one, but wrapping a plain
  // `string` url the same way keeps both forms equally safe against frequent re-renders
  // (autoscroll, page tracking, the resize handling during fullscreen) silently reloading the
  // document from scratch mid-scroll.
  const file = useMemo(() => sourceFile, [sourceFile]);

  const jumpToPage = (target: number) => {
    setPage(target);
    const node = pageRefs.current[target - 1];
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Keyboard shortcuts: Page navigation and zoom, ignored while the page-jump box (or anything
  // else) has focus so typing never gets hijacked.
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
        setZoom((value) => Math.min(2.25, Number((value + 0.15).toFixed(2))));
      } else if (event.key === '-') {
        setZoom((value) => Math.max(0.7, Number((value - 0.15).toFixed(2))));
      }
    };
    frame.addEventListener('keydown', onKeyDown);
    return () => frame.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pages]);

  return (
    <div
      ref={frameRef}
      tabIndex={-1}
      className={cn('bg-slate-200 text-slate-950 outline-none', className)}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-300 bg-white px-2 shadow-sm sm:px-3">
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
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setSpeedMenuOpen((value) => !value)}
                aria-label="Auto-scroll speed"
                title="Auto-scroll speed"
              >
                <Gauge className="h-4 w-4" />
              </Button>
              {speedMenuOpen && (
                <>
                  {/* Backdrop to close the menu on outside click/tap */}
                  <div className="fixed inset-0 z-[5]" onClick={() => setSpeedMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-10 mt-1 w-24 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    {AUTO_SCROLL_SPEEDS.map((speed, index) => (
                      <button
                        key={speed.label}
                        type="button"
                        onClick={() => {
                          setSpeedIndex(index);
                          setSpeedMenuOpen(false);
                        }}
                        className={cn(
                          'block w-full rounded-md px-2 py-1 text-left text-xs font-medium',
                          index === speedIndex ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100',
                        )}
                      >
                        {speed.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="mx-1 h-5 w-px bg-slate-200" />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setZoom((value) => Math.max(0.7, Number((value - 0.15).toFixed(2))))}
              disabled={zoom <= 0.7}
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="hidden w-11 text-center text-xs tabular-nums sm:inline">{Math.round(zoom * 100)}%</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setZoom((value) => Math.min(2.25, Number((value + 0.15).toFixed(2))))}
              disabled={zoom >= 2.25}
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
          className="min-h-0 flex-1 overflow-auto overscroll-contain scroll-smooth p-3 [scrollbar-gutter:stable] sm:p-6"
        >
          {error ? (
            <div className="mx-auto flex min-h-64 max-w-md flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-sm">
              <FileWarning className="mb-3 h-9 w-9 text-amber-600" />
              <p className="font-semibold">The PDF could not be loaded</p>
              <p className="mt-2 text-sm text-slate-600">{error}</p>
            </div>
          ) : containerWidth > 0 ? (
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
                setError('The response is not a valid PDF, or the connection was interrupted. Reopen the file and try again.');
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
                          const view = loadedPage.view; // [x0, y0, x1, y1] at scale 1, unrotated
                          const [x0, y0, x1, y1] = view;
                          if (x0 === undefined || y0 === undefined || x1 === undefined || y1 === undefined) return;
                          const w = x1 - x0;
                          const h = y1 - y0;
                          if (w <= 0 || h <= 0) return;
                          const aspect = w / h;
                          setPageAspects((current) =>
                            current[pageNumber] === aspect ? current : { ...current, [pageNumber]: aspect },
                          );
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
          ) : null}
        </div>

        {autoScrolling && (
          <div className="flex shrink-0 items-center justify-center gap-2 border-t border-slate-300 bg-white/95 px-3 py-1 text-[11px] font-medium text-slate-500">
            <ChevronDown className="h-3.5 w-3.5 animate-bounce text-primary" />
            Auto-scrolling at {AUTO_SCROLL_SPEEDS[speedIndex]?.label} — scroll or tap pause to stop
          </div>
        )}
      </div>
    </div>
  );
}
