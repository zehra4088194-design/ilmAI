import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookMarked, CheckCircle2, FileQuestion, FileText, ListChecks } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AdSenseBanner } from '@/components/features/ads/AdSenseBanner';
import {
  buildCatalogSearch,
  isCatalogResourceVisible,
  LIBRARY_SECTIONS,
  parseLibraryResourceType,
} from '@/lib/resources/catalog';

const SECTION_ICONS = {
  reading: BookMarked,
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
    user ? supabase.from('profiles').select('board, grade_level').eq('id', user.id).single() : Promise.resolve({ data: null }),
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

  let resourcesQuery = (supabase.from('library_resources') as any)
    .select('id, title, book_title, content_section, has_context_text, board, grade_level')
    .eq('resource_type', resourceType);
  resourcesQuery = subject ? resourcesQuery.eq('subject_id', subject.id) : resourcesQuery.is('subject_id', null);
  resourcesQuery = chapter ? resourcesQuery.eq('chapter_id', chapter.id) : resourcesQuery.is('chapter_id', null);
  if (bookTitle) resourcesQuery = resourcesQuery.eq('book_title', bookTitle);
  const { data: resources } = await resourcesQuery;
  const visibleResources = (resources || []).filter((resource: any) => isCatalogResourceVisible(resource, profile));
  const resolvedBookTitle =
    bookTitle || visibleResources[0]?.book_title || `${subject?.name || 'General'} ${resourceType === 'notes' ? 'Notes' : 'Text Book'}`;
  const catalogSearch = buildCatalogSearch(resourceType, resolvedBookTitle);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href={`/library/${subjectSlug}?${catalogSearch}`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium">
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
      <AdSenseBanner slot="inline" className="mx-auto max-w-5xl" />

      <div className="grid gap-4 sm:grid-cols-2">
        {LIBRARY_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.value];
          const sectionFiles = visibleResources.filter(
            (resource: any) => (resource.content_section || 'reading') === section.value
          );
          const contextReady = sectionFiles.filter((resource: any) => resource.has_context_text).length;
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
                    <Badge variant={sectionFiles.length ? 'secondary' : 'outline'}>{sectionFiles.length} files</Badge>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold">{section.title}</h2>
                  <p className="text-muted-foreground mt-1 text-sm">{section.description}</p>
                  <div className="border-border/70 mt-5 flex items-center justify-between border-t pt-4 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {contextReady} AI text ready
                    </span>
                    <ArrowRight className="text-primary h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
