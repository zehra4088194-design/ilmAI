'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { extractYouTubeId, getYouTubeThumbnailCandidates } from '@/lib/utils/extractYouTubeId';
import { cn } from '@/lib/utils/cn';

type Props = {
  youtubeUrl: string;
  thumbnailUrl?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
};

export function YouTubeThumbnailImage({ youtubeUrl, thumbnailUrl, alt, className, fallbackClassName }: Props) {
  const candidates = useMemo(() => {
    const videoId = extractYouTubeId(youtubeUrl);
    const urls = [
      ...(videoId ? [`/api/media/youtube-thumbnail/${videoId}`] : []),
      ...(thumbnailUrl ? [thumbnailUrl] : []),
      ...getYouTubeThumbnailCandidates(youtubeUrl),
    ];
    return Array.from(new Set(urls.filter(Boolean)));
  }, [thumbnailUrl, youtubeUrl]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const src = candidates[index];

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [candidates]);

  useEffect(() => {
    setLoaded(false);

    // Cached images can finish before React attaches onLoad during hydration.
    const image = imageRef.current;
    if (image?.complete && image.currentSrc && image.naturalWidth > 2 && image.naturalHeight > 2) {
      setLoaded(true);
    }
  }, [src]);

  if (!src) {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800',
          fallbackClassName
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(99,102,241,0.35),transparent_42%)]" />
        <div className="relative flex flex-col items-center gap-2 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 shadow-sm backdrop-blur">
            <ImageOff className="h-5 w-5" />
          </span>
          <span className="text-xs font-medium text-white/80">Thumbnail preview</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800',
        fallbackClassName
      )}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
        </div>
      )}
      <img
        ref={imageRef}
        key={src}
        src={src}
        alt={alt}
        className={cn(className, 'relative z-[1]')}
        loading="lazy"
        decoding="async"
        onError={() => {
          setLoaded(false);
          setIndex((current) => current + 1);
        }}
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth <= 2 || image.naturalHeight <= 2) {
            setIndex((current) => current + 1);
            return;
          }
          setLoaded(true);
        }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
