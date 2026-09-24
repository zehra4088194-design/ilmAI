'use client';

import { useEffect, useRef, useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';

/**
 * Interactive, rotatable 3D molecule view — drag to rotate, scroll to zoom. Fetches raw 3D
 * coordinate data from our own /api/pubchem/structure proxy (format=sdf) and renders it client-side
 * with 3Dmol.js. The upstream structure database is never named anywhere in this UI — only our own
 * generic "structure data" wording and domain are ever visible to the viewer.
 */
export function MoleculeViewer3D({ dataUrl }: { dataUrl: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<{ resize: () => void } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    (async () => {
      try {
        const [sdfRes, $3Dmol] = await Promise.all([fetch(dataUrl), import('3dmol')]);
        if (!sdfRes.ok) throw new Error('Structure data not available');
        const sdfText = await sdfRes.text();
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = '';
        const viewer = $3Dmol.createViewer(containerRef.current, { backgroundColor: 'white' });
        viewerRef.current = viewer;
        viewer.addModel(sdfText, 'sdf');
        viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.28 } });
        viewer.zoomTo();
        viewer.render();
        viewer.zoom(1.1, 400);
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      viewerRef.current = null;
    };
  }, [dataUrl]);

  // The viewer sizes its canvas off the container's dimensions at creation time — a resize
  // (e.g. rotating a phone, or the modal itself changing size) needs an explicit nudge to redraw
  // at the new size instead of staying stretched/cropped.
  useEffect(() => {
    if (status !== 'ready' || !containerRef.current) return;
    const observer = new ResizeObserver(() => viewerRef.current?.resize());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [status]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {status === 'loading' && (
        <div className="bg-background/80 absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
          <p className="text-muted-foreground text-xs">Loading 3D structure...</p>
        </div>
      )}
      {status === 'error' && (
        <div className="bg-muted/30 absolute inset-0 flex flex-col items-center justify-center rounded-md border border-dashed p-5 text-center">
          <FlaskConical className="h-10 w-10 text-cyan-500" />
          <p className="mt-3 text-sm font-semibold">3D structure is not available for this exact name.</p>
          <p className="text-muted-foreground mt-2 text-xs leading-5">
            Try searching the official generic name or a simpler salt name.
          </p>
        </div>
      )}
    </div>
  );
}
