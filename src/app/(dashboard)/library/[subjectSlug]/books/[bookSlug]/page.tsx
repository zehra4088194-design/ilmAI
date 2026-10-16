import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, FileText, Layers3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HouseAdBanner } from '@/components/features/ads/HouseAdBanner';
import {
  buildBookPath,
  buildCatalogSearch,
  getLibraryResourceTypeLabel,
  isCatalogResourceVisible,
  matchBookTitle,
  normalizeLegacyCatalogResource,
  parseLibraryResourceType,
} from '@/lib/resources/catalog';

async function resolveBookContext(
  subjectSlug: string,
  bookSlug: string,
  resourceType: ReturnType<typeof parseLibraryResourceType>
) {
  const supabase = await createClient();
  const pdfStorage = createServiceClient();

  const subjectResult =
    subjectSlug === 'general'
      ? { data: null }
      : await supabase.from('subjects').select('id, name, slug, color').eq('slug', subjectSlug).maybeSingle();
  const subject = subjectResult.data as { id: string; name: string; slug: string; color: string } | null;
  if (subjectSlug !== 'general' && !subject) return null;

  let resourcesQuery = (pdfStorage.from('library_resources') as any)
    .select(
      'id, title, description, book_title, content_section, has_context_text, resource_type, drive_url, light_file_url, dark_file_url, subject_id, chapter_id, board, grade_level, chapters(id, name, slug, order_index)'
    )
    .eq('resource_type', resourceType)
    .order('created_at', { ascending: true });
  resourcesQuery = subject ? resourcesQuery.eq('subject_id', subject.id) : resourcesQuery.is('subject_id', null);
  const catalogResult = await resourcesQuery;
  let resources = catalogResult.data as any[] | null;

  if (catalogResult.error) {
    console.warn('Structured library catalog is not migrated yet; using the safe legacy book fallback.');
    let fallbackQuery = (pdfStorage.from('library_resources') as any)
      .select(
        'id, title, description, context_text_url, resource_type, drive_url, light_file_url, dark_file_url, subject_id, chapter_id, board, grade_level, chapters(id, name, slug, order_index)'
      )
      .eq('resource_type', resourceType)
      .order('created_at', { ascending: true });
    fallbackQuery = subject ? fallbackQuery.eq('subject_id', subject.id) : fallbackQuery.is('subject_id', null);
    const fallbackResult = await fallbackQuery;
    resources = (fallbackResult.data || []).map((resource: any) =>
      normalizeLegacyCatalogResource({ ...resource, subjects: subject })
    );
  }

  const matchedTitle = matchBookTitle(
    (resources || []).map((r) => r.book_title),
    bookSlug
  );
  if (!matchedTitle) return null;

  const bookResources = (resources || []).filter((r) => r.book_title === matchedTitle);
  return { subject, matchedTitle, bookResources };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ subjectSlug: string; bookSlug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ subjectSlug, bookSlug }, queryParams] = await Promise.all([params, searchParams]);
  const resourceType = parseLibraryResourceType(queryParams.type);
  const ctx = await resolveBookContext(subjectSlug, bookSlug, resourceType);
  if (!ctx) {
    return { title: 'Book Not Found | ilm AI Library', robots: { index: false, follow: false } };
  }
  const subjectName = ctx.subject?.name || 'General';
  const typeLabel = getLibraryResourceTypeLabel(resourceType);
  return {
    title: `${ctx.matchedTitle} — ${subjectName} ${typeLabel} | ilm AI Library`,
    description: `Free ${ctx.matchedTitle} for ${subjectName}: chapter notes, MCQs, and study files — read online, no sign-up needed.`,
    alternates: { canonical: buildBookPath(subjectSlug, ctx.matchedTitle) },
  };
}

export default async function LibraryBookLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectSlug: string; bookSlug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ subjectSlug, bookSlug }, queryParams] = await Promise.all([params, searchParams]);
  const resourceType = parseLibraryResourceType(queryParams.type);

  const ctx = await resolveBookContext(subjectSlug, bookSlug, resourceType);
  if (!ctx) notFound();

  const visibleResources = ctx.bookResources.filter((resource: any) =>
    isCatalogResourceVisible(resource, null)
  );

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
      resources: [] as typeof visibleResources,
    };
    group.resources.push(resource);
    chapterGroups.set(id, group);
  }
  const chapters = [...chapterGroups.values()].sort((left, right) => left.order - right.order);
  const catalogSearch = buildCatalogSearch(resourceType, ctx.matchedTitle);
  const subjectName = ctx.subject?.name || 'General';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/library?type=${resourceType}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>

      <section className="space-y-3">
        <Badge variant="secondary">{subjectName}</Badge>
        <h1 className="text-3xl font-bold tracking-tight">{ctx.matchedTitle}</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          {getLibraryResourceTypeLabel(resourceType, true)} for {subjectName}. Only files from this book are listed
          below.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <p className="font-semibold">{chapters.length}</p>
            <p className="text-muted-foreground text-xs">Chapters</p>
          </div>
          <div>
            <p className="font-semibold">{visibleResources.length}</p>
            <p className="text-muted-foreground text-xs">Files</p>
          </div>
        </div>
      </section>
      <HouseAdBanner slot="store_products" className="mx-auto max-w-5xl" categoryContext={subjectName} />

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
                          {contextCount} study-ready
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
