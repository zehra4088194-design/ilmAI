import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, FileText, Layers3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdSenseBanner } from '@/components/features/ads/AdSenseBanner';
import {
  buildCatalogSearch,
  isCatalogResourceVisible,
  normalizeLegacyCatalogResource,
  parseLibraryResourceType,
} from '@/lib/resources/catalog';

export default async function LibraryBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectSlug: string }>;
  searchParams: Promise<{ type?: string; book?: string }>;
}) {
  const [{ subjectSlug }, queryParams] = await Promise.all([params, searchParams]);
  const resourceType = parseLibraryResourceType(queryParams.type);
  const requestedBook = queryParams.book?.trim() || null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, subjectResult] = await Promise.all([
    user
      ? supabase.from('profiles').select('board, grade_level').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    subjectSlug === 'general'
      ? Promise.resolve({ data: null })
      : supabase.from('subjects').select('id, name, slug, color').eq('slug', subjectSlug).maybeSingle(),
  ]);
  const subject = subjectResult.data as { id: string; name: string; slug: string; color: string } | null;
  if (subjectSlug !== 'general' && !subject) notFound();

  let resourcesQuery = (supabase.from('library_resources') as any)
    .select(
      'id, title, description, book_title, content_section, has_context_text, resource_type, drive_url, light_file_url, dark_file_url, subject_id, chapter_id, board, grade_level, chapters(id, name, slug, order_index)'
    )
    .eq('resource_type', resourceType)
    .order('created_at', { ascending: true });
  resourcesQuery = subject ? resourcesQuery.eq('subject_id', subject.id) : resourcesQuery.is('subject_id', null);
  if (requestedBook) resourcesQuery = resourcesQuery.eq('book_title', requestedBook);
  const catalogResult = await resourcesQuery;
  let resources = catalogResult.data;
  if (catalogResult.error) {
    console.warn('Structured library catalog is not migrated yet; using the safe legacy subject fallback.');
    let fallbackQuery = (supabase.from('library_resources') as any)
      .select(
        'id, title, description, context_text_url, resource_type, drive_url, light_file_url, dark_file_url, subject_id, chapter_id, board, grade_level, chapters(id, name, slug, order_index)'
      )
      .eq('resource_type', resourceType)
      .order('created_at', { ascending: true });
    fallbackQuery = subject ? fallbackQuery.eq('subject_id', subject.id) : fallbackQuery.is('subject_id', null);
    const fallbackResult = await fallbackQuery;
    resources = (fallbackResult.data || [])
      .map((resource: any) => normalizeLegacyCatalogResource({ ...resource, subjects: subject }))
      .filter((resource: any) => !requestedBook || resource.book_title === requestedBook);
  }

  const visibleResources = (resources || []).filter((resource: any) => isCatalogResourceVisible(resource, profile));
  const bookTitle =
    requestedBook ||
    visibleResources[0]?.book_title ||
    `${subject?.name || 'General'} ${resourceType === 'notes' ? 'Notes' : 'Text Book'}`;

  const chapterGroups = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      order: number;
      resources: typeof visibleResources;
    }
  >();
  for (const resource of visibleResources) {
    const chapter = resource.chapters;
    const id = chapter?.id || 'general';
    const group = chapterGroups.get(id) || {
      id,
      name: chapter?.name || 'General Files',
      slug: chapter?.slug || 'general',
      order: chapter?.order_index ?? 9999,
      resources: [],
    };
    group.resources.push(resource);
    chapterGroups.set(id, group);
  }
  const chapters = [...chapterGroups.values()].sort((left, right) => left.order - right.order);
  const catalogSearch = buildCatalogSearch(resourceType, bookTitle);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/library?type=${resourceType}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>

      <section className="border-border/70 from-primary/15 via-card overflow-hidden rounded-3xl border bg-gradient-to-br to-cyan-500/10 p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge>{subject?.name || 'General'}</Badge>
              <Badge variant="outline">{resourceType === 'notes' ? 'Notes collection' : 'Text book'}</Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">{bookTitle}</h1>
            <p className="text-muted-foreground mt-2">Select a chapter to view its files organized by content type.</p>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2">
            <div className="border-border/60 bg-background/50 rounded-2xl border p-4 text-center">
              <p className="text-2xl font-bold">{chapters.length}</p>
              <p className="text-muted-foreground text-xs">Chapters</p>
            </div>
            <div className="border-border/60 bg-background/50 rounded-2xl border p-4 text-center">
              <p className="text-2xl font-bold">{visibleResources.length}</p>
              <p className="text-muted-foreground text-xs">Files</p>
            </div>
          </div>
        </div>
      </section>
      <AdSenseBanner slot="inline" className="mx-auto max-w-5xl" />

      {chapters.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {chapters.map((chapter, index) => {
            const sections = new Set(chapter.resources.map((resource: any) => resource.content_section || 'reading'));
            const contextCount = chapter.resources.filter((resource: any) => resource.has_context_text).length;
            return (
              <Link
                key={chapter.id}
                href={`/library/${subjectSlug}/${chapter.slug}?${catalogSearch}`}
                className="group block"
              >
                <Card className="border-border/70 hover:border-primary/40 h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg">
                  <CardContent className="flex h-full items-start gap-4 p-5">
                    <span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold">{chapter.name}</h2>
                      <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {chapter.resources.length} files
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Layers3 className="h-3.5 w-3.5" />
                          {sections.size} sections
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {contextCount} AI text
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="text-primary mt-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No chapter files found in this book"
          description="Ask an admin to select the same book name, subject, and chapter when adding files."
          primaryHref="/library"
          primaryLabel="Back to Library"
        />
      )}
    </div>
  );
}
