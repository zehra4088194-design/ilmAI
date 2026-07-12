'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const src = candidates[index];

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  if (!src) {
    return (
      <div className={cn('flex items-center justify-center rounded bg-muted', fallbackClassName)}>
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setIndex((current) => current + 1)}
      referrerPolicy="no-referrer"
    />
  );
}
