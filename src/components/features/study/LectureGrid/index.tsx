'use client';

import { useState } from 'react';
import { PlayCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { YouTubeThumbnailImage } from '@/components/ui/YouTubeThumbnailImage';
import { extractYouTubeId } from '@/lib/utils/extractYouTubeId';

export type StudyLecture = {
  id: string;
  title: string;
  youtube_url: string;
  thumbnail_url: string | null;
  kind: 'lecture' | 'exercise_walkthrough';
  exercise_number: string | null;
  duration_seconds: number | null;
};

function formatDuration(seconds?: number | null) {
  if (!seconds) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function LectureGrid({ lectures }: { lectures: StudyLecture[] }) {
  const [activeLecture, setActiveLecture] = useState<StudyLecture | null>(null);
  const activeVideoId = activeLecture ? extractYouTubeId(activeLecture.youtube_url) : null;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {lectures.map((lecture) => (
          <Card key={lecture.id} className="overflow-hidden border-border/60 bg-card/80">
            <button type="button" className="group block w-full text-left" onClick={() => setActiveLecture(lecture)}>
              <div className="relative aspect-video overflow-hidden bg-muted">
                <YouTubeThumbnailImage
                  youtubeUrl={lecture.youtube_url}
                  thumbnailUrl={lecture.thumbnail_url}
                  alt={lecture.title}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  fallbackClassName="h-full w-full"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-90 transition-opacity group-hover:opacity-100">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-background/90 text-primary shadow-lg">
                    <PlayCircle className="h-8 w-8" />
                  </span>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant={lecture.kind === 'exercise_walkthrough' ? 'secondary' : 'outline'}>
                    {lecture.kind === 'exercise_walkthrough' ? lecture.exercise_number || 'Exercise' : 'Lecture'}
                  </Badge>
                  {formatDuration(lecture.duration_seconds) && <Badge variant="outline">{formatDuration(lecture.duration_seconds)}</Badge>}
                </div>
                <h3 className="line-clamp-2 font-semibold">{lecture.title}</h3>
              </CardContent>
            </button>
          </Card>
        ))}
      </div>

      {activeLecture && activeVideoId && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm">
          <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
            <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold sm:text-base">{activeLecture.title}</p>
                <p className="text-xs text-muted-foreground">In-app lecture player</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setActiveLecture(null)} aria-label="Close lecture">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&rel=0`}
                title={activeLecture.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
