'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileWarning, Loader2, Minus, Plus, RotateCw } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export function ProtectedPdfViewer({
  url,
  title,
  className,
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateWidth = () => setContainerWidth(viewport.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPages(0);
    setPage(1);
    setZoom(1);
    setRotation(0);
    setError(null);
  }, [url]);

  const fittedWidth = Math.max(240, Math.min(containerWidth - 24, 1100));
  const renderedWidth = Math.round(fittedWidth * zoom);

  return (
    <div className={cn('bg-slate-200 text-slate-950', className)}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-300 bg-white px-2 shadow-sm sm:px-3">
          <div className="flex min-w-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1 || !pages}
              aria-label="Previous PDF page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-16 text-center text-xs font-semibold tabular-nums sm:text-sm">
              {pages ? `${page} / ${pages}` : 'Loading'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage((value) => Math.min(pages, value + 1))}
              disabled={!pages || page >= pages}
              aria-label="Next PDF page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <p className="hidden min-w-0 flex-1 truncate px-3 text-center text-xs font-medium md:block">{title}</p>

          <div className="flex shrink-0 items-center gap-0.5">
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

        <div ref={viewportRef} className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-4">
          {error ? (
            <div className="mx-auto flex min-h-64 max-w-md flex-col items-center justify-center rounded-2xl bg-white p-6 text-center shadow-sm">
              <FileWarning className="mb-3 h-9 w-9 text-amber-600" />
              <p className="font-semibold">PDF load nahi ho saki</p>
              <p className="mt-2 text-sm text-slate-600">{error}</p>
            </div>
          ) : containerWidth > 0 ? (
            <Document
              file={{ url }}
              loading={
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-600">
                  <Loader2 className="text-primary h-8 w-8 animate-spin" />
                  <p className="text-sm font-medium">Protected PDF load ho rahi hai...</p>
                </div>
              }
              onLoadSuccess={({ numPages }) => {
                setPages(numPages);
                setPage((value) => Math.min(Math.max(1, value), numPages));
              }}
              onLoadError={(loadError) => {
                console.error('Protected PDF render failed:', loadError);
                setError('File response valid PDF nahi hai ya connection interrupt ho gaya. Dobara open karke try karein.');
              }}
              className="flex min-w-full justify-center"
            >
              <Page
                key={`${page}:${zoom}:${rotation}`}
                pageNumber={page}
                width={renderedWidth}
                rotate={rotation}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                loading={
                  <div className="flex min-h-64 w-full items-center justify-center">
                    <Loader2 className="text-primary h-7 w-7 animate-spin" />
                  </div>
                }
                className="overflow-hidden rounded-sm bg-white shadow-xl"
              />
            </Document>
          ) : null}
        </div>
      </div>
    </div>
  );
}
