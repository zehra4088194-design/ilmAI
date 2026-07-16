'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { FileText, Video, DownloadCloud, LockKeyhole, Loader2, Maximize2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { isDarkThemeId } from '@/lib/constants/themes';
import type { CollegeLecture, CollegeResource, CollegeResourceMetadata } from '@/lib/college/types';
import {
  ProtectedResourceReader,
  fetchProtectedResourceBlob,
} from '@/components/features/resources/ProtectedResourceReader';
import { ResourceAiTools } from '@/components/features/resources/ResourceAiTools';
import { saveOfflineResource } from '@/lib/offline/resources';
import { toast } from 'sonner';

const TYPE_LABELS: Record<CollegeResource['resource_type'], string> = {
  notes: 'Notes',
  past_paper: 'Past paper',
  slides: 'Slides',
  other: 'Other',
};

function toEmbedUrl(videoUrl: string): string {
  try {
    const url = new URL(videoUrl);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    if (host.endsWith('youtube.com')) {
      const id = url.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${id}` : videoUrl;
    }
    if (host === 'drive.google.com') return videoUrl.replace('/view', '/preview');
    return videoUrl;
  } catch {
    return videoUrl;
  }
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() || '';
}

export function CollegeDashboardTabs({
  lectures,
  resources,
  profile,
}: {
  lectures: CollegeLecture[];
  resources: CollegeResourceMetadata[];
  profile?: {
    university_stream?: string | null;
    university_degree?: string | null;
    university_semester?: string | null;
  } | null;
}) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const settings = usePlatformSettings();
  const userTier = user?.subscriptionTier || 'FREE';
  const canDownload = settings.subscriptionPlans[userTier].access.downloadPDF;
  const [readerResource, setReaderResource] = useState<CollegeResourceMetadata | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const isDarkMode = isDarkThemeId(theme);
  const mode = isDarkMode ? 'dark' : 'light';

  const matchesProfileScope = (item: {
    stream: string | null;
    degree_name: string | null;
    semester: string | null;
  }) => {
    if (
      normalize(profile?.university_stream) &&
      normalize(item.stream) &&
      normalize(profile?.university_stream) !== normalize(item.stream)
    )
      return false;
    if (
      normalize(profile?.university_degree) &&
      normalize(item.degree_name) &&
      normalize(profile?.university_degree) !== normalize(item.degree_name)
    )
      return false;
    if (
      normalize(profile?.university_semester) &&
      normalize(item.semester) &&
      normalize(profile?.university_semester) !== normalize(item.semester)
    )
      return false;
    return true;
  };

  const filteredLectures = lectures.filter(matchesProfileScope);
  const filteredResources = resources.filter(matchesProfileScope);
  const saveForOffline = async (resource: CollegeResourceMetadata) => {
    setDownloadingId(resource.id);
    try {
      const blob = await fetchProtectedResourceBlob({
        kind: 'college-resource',
        id: resource.id,
        mode,
        purpose: 'offline',
      });
      await saveOfflineResource({
        resourceId: resource.id,
        kind: 'college-resource',
        mode,
        title: resource.title,
        mimeType: blob.type || 'application/pdf',
        blob,
        savedAt: new Date().toISOString(),
      });
      toast.success('College file app Downloads mein save ho gayi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Offline save nahi ho saka.');
    } finally {
      setDownloadingId(null);
    }
  };

  const chapters = [
    ...new Set([
      ...filteredLectures.map(
        (lecture) => `${lecture.course_name || 'General'}|||${lecture.chapter_title || 'Ungrouped'}`
      ),
      ...filteredResources.map(
        (resource) => `${resource.course_name || 'General'}|||${resource.chapter_title || 'Ungrouped'}`
      ),
    ]),
  ].map((key) => {
    const [course, chapter] = key.split('|||');
    return { course, chapter };
  });

  return (
    <Tabs defaultValue="lectures" className="w-full">
      <TabsList>
        <TabsTrigger value="lectures">Lectures ({filteredLectures.length})</TabsTrigger>
        <TabsTrigger value="resources">Resources ({filteredResources.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="lectures" className="mt-4">
        {filteredLectures.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No lectures added yet"
            description="Your college admin hasn't added any matching chapter lectures yet."
          />
        ) : (
          <div className="space-y-5">
            {chapters.map(({ course, chapter }) => {
              const chapterLectures = filteredLectures.filter(
                (lecture) =>
                  (lecture.course_name || 'General') === course && (lecture.chapter_title || 'Ungrouped') === chapter
              );
              if (chapterLectures.length === 0) return null;
              return (
                <section key={`lecture-${course}-${chapter}`} className="space-y-3">
                  <div className="border-border/70 bg-card/70 rounded-2xl border p-4">
                    <p className="text-muted-foreground text-xs font-semibold tracking-[0.22em] uppercase">{course}</p>
                    <h3 className="mt-1 text-lg font-semibold">{chapter}</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {chapterLectures.map((lecture) => (
                      <div
                        key={lecture.id}
                        className="glass border-border/60 bg-card/60 overflow-hidden rounded-2xl border backdrop-blur-xl"
                      >
                        <div className="bg-muted aspect-video w-full">
                          <iframe
                            src={toEmbedUrl(lecture.video_url)}
                            title={lecture.title}
                            loading="lazy"
                            className="h-full w-full"
                            allowFullScreen
                          />
                        </div>
                        <div className="p-4">
                          <p className="font-medium">{lecture.title}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {[lecture.stream, lecture.degree_name, lecture.semester].filter(Boolean).join(' · ')}
                          </p>
                          {lecture.description && (
                            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{lecture.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </TabsContent>

      <TabsContent value="resources" className="mt-4">
        {filteredResources.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No resources yet"
            description="Your college admin hasn't added any matching notes or past papers yet."
          />
        ) : (
          <div className="space-y-5">
            {chapters.map(({ course, chapter }) => {
              const chapterResources = filteredResources.filter(
                (resource) =>
                  (resource.course_name || 'General') === course && (resource.chapter_title || 'Ungrouped') === chapter
              );
              if (chapterResources.length === 0) return null;
              return (
                <section key={`resource-${course}-${chapter}`} className="space-y-3">
                  <div className="border-border/70 bg-card/70 rounded-2xl border p-4">
                    <p className="text-muted-foreground text-xs font-semibold tracking-[0.22em] uppercase">{course}</p>
                    <h3 className="mt-1 text-lg font-semibold">{chapter}</h3>
                  </div>
                  <div className="space-y-3">
                    {chapterResources.map((resource) => (
                      <div
                        key={resource.id}
                        className="glass border-border/60 bg-card/60 space-y-4 rounded-2xl border p-4 backdrop-blur-xl transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{resource.title}</p>
                              <Badge variant="secondary">{TYPE_LABELS[resource.resource_type]}</Badge>
                              <Badge variant="outline">Protected</Badge>
                            </div>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {[resource.stream, resource.degree_name, resource.semester].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => setReaderResource(resource)}>
                            <Maximize2 className="h-3.5 w-3.5" />
                            Read
                          </Button>
                        </div>
                        <ResourceAiTools kind="college-resource" resourceId={resource.id} />
                        {canDownload ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => saveForOffline(resource)}
                            disabled={downloadingId === resource.id}
                          >
                            {downloadingId === resource.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <DownloadCloud className="h-3.5 w-3.5" />
                            )}
                            Save in app for offline
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full" asChild>
                            <Link href="/subscription">
                              <LockKeyhole className="h-3.5 w-3.5" /> Offline save{' '}
                              <Badge className="ml-1 text-[10px]">Pro</Badge>
                            </Link>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </TabsContent>

      {readerResource && (
        <ProtectedResourceReader
          open
          onClose={() => setReaderResource(null)}
          kind="college-resource"
          resourceId={readerResource.id}
          mode={mode}
          title={readerResource.title}
        />
      )}
    </Tabs>
  );
}
