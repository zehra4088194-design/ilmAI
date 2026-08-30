import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookMarked, Calculator, CheckCircle2, FileQuestion, FileText, Files, ListChecks } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HouseAdBanner } from '@/components/features/ads/HouseAdBanner';
import {
  buildCatalogSearch,
  getLibraryResourceTypeLabel,
  isCatalogResourceVisible,
  LIBRARY_SECTIONS,
  normalizeLegacyCatalogResource,
  parseLibraryResourceType,
} from '@/lib/resources/catalog';

// Every LIBRARY_SECTIONS entry needs a key here, same reasoning as the /study chapter page: a
// missing key means `Icon` is `undefined` and React throws on render for any chapter whose
// resources include that section.
const SECTION_ICONS = {
  reading: BookMarked,
  numericals: Calculator,
  mcq: ListChecks,
  short: FileQuestion,
  long: FileText,
};

export default async function LibraryChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectSlug: string; chapterSlug: string }>;
  searchParams: Promise<{ type?: string; book?: string }>;
}) {
  const [{ subjectSlug, chapterSlug }, queryParams] = await Promise.all([params, searchParams]);
  const resourceType = parseLibraryResourceType(queryParams.type);
  const bookTitle = queryParams.book?.trim() || null;
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
      : supabase.from('subjects').select('id, name, slug').eq('slug', subjectSlug).maybeSingle(),
  ]);
  const subject = subjectResult.data as { id: string; name: string; slug: string } | null;
  if (subjectSlug !== 'general' && !subject) notFound();

  const { data: chapter } =
    chapterSlug === 'general' || !subject
      ? { data: null }
      : await supabase
          .from('chapters')
          .select('id, name, slug')
          .eq('subject_id', subject.id)
          .eq('slug', chapterSlug)
          .maybeSingle();
  if (chapterSlug !== 'general' && !chapter) notFound();

  const pdfStorage = createServiceClient();
  let resourcesQuery = (pdfStorage.from('library_resources') as any)
    .select('id, title, book_title, content_section, has_context_text, drive_url, light_file_url, dark_file_url, board, grade_level')
    .eq('resource_type', resourceType);
  resourcesQuery = subject ? resourcesQuery.eq('subject_id', subject.id) : resourcesQuery.is('subject_id', null);
  resourcesQuery = chapter ? resourcesQuery.eq('chapter_id', chapter.id) : resourcesQuery.is('chapter_id', null);
  if (bookTitle) resourcesQuery = resourcesQuery.eq('book_title', bookTitle);
  const catalogResult = await resourcesQuery;
  let resources = catalogResult.data;
  if (catalogResult.error) {
    console.warn('Structured library catalog is not migrated yet; using the safe legacy chapter fallback.');
    let fallbackQuery = (pdfStorage.from('library_resources') as any)
      .select('id, title, context_text_url, drive_url, light_file_url, dark_file_url, board, grade_level')
      .eq('resource_type', resourceType);
    fallbackQuery = subject ? fallbackQuery.eq('subject_id', subject.id) : fallbackQuery.is('subject_id', null);
    fallbackQuery = chapter ? fallbackQuery.eq('chapter_id', chapter.id) : fallbackQuery.is('chapter_id', null);
    const fallbackResult = await fallbackQuery;
    resources = (fallbackResult.data || [])
      .map((resource: any) =>
        normalizeLegacyCatalogResource({
          ...resource,
          resource_type: resourceType,
          subjects: subject,
        })
      )
      .filter((resource: any) => !bookTitle || resource.book_title === bookTitle);
  }
  const visibleResources = (resources || []).filter((resource: any) => isCatalogResourceVisible(resource, profile));
  const resolvedBookTitle =
    bookTitle ||
    visibleResources[0]?.book_title ||
    `${subject?.name || 'General'} ${getLibraryResourceTypeLabel(resourceType)}`;
  const catalogSearch = buildCatalogSearch(resourceType, resolvedBookTitle);
  const availableSections = LIBRARY_SECTIONS.map((section) => ({
    ...section,
    files: visibleResources.filter((resource: any) => (resource.content_section || 'reading') === section.value),
  })).filter((section) => section.files.length > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/library/${subjectSlug}?${catalogSearch}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" /> Back to chapters
      </Link>

      <div className="border-border/70 bg-card/80 rounded-3xl border p-5 sm:p-7">
        <div className="flex flex-wrap gap-2">
          <Badge>{subject?.name || 'General'}</Badge>
          <Badge variant="outline">{resolvedBookTitle}</Badge>
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{chapter?.name || 'General Files'}</h1>
        <p className="text-muted-foreground mt-2">The next page will open only files from the section you select.</p>
      </div>
      <HouseAdBanner slot="content_inline" className="mx-auto max-w-5xl" />

      {availableSections.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {availableSections.map((section) => {
          const Icon = SECTION_ICONS[section.value];
          return (
            <Link
              key={section.value}
              href={`/library/${subjectSlug}/${chapterSlug}/${section.slug}?${catalogSearch}`}
              className="group block"
            >
              <Card className="border-border/70 hover:border-primary/40 h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl">
                      <Icon className="h-6 w-6" />
                    </span>
                    <Badge variant="secondary">{section.files.length} files</Badge>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold">{section.title}</h2>
                  <p className="text-muted-foreground mt-1 text-sm">{section.description}</p>
                  <div className="border-border/70 mt-5 flex items-center justify-between border-t pt-4 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Study tools ready
                    </span>
                    <ArrowRight className="text-primary h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Files}
          title="No files have been added for this chapter yet"
          description="This chapter will show Reading, MCQs, Short Questions, or Long Questions only after an admin uploads files for those sections."
          primaryHref={`/library/${subjectSlug}?${catalogSearch}`}
          primaryLabel="Back to chapters"
        />
      )}
    </div>
  );
}
