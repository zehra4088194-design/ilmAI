import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Files } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { GoogleDriveResourceCard } from '@/components/features/library/GoogleDriveResourceCard';
import {
  buildCatalogSearch,
  getLibrarySection,
  isCatalogResourceVisible,
  normalizeLegacyCatalogResource,
  parseLibraryResourceType,
} from '@/lib/resources/catalog';

export default async function LibrarySectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectSlug: string; chapterSlug: string; sectionSlug: string }>;
  searchParams: Promise<{ type?: string; book?: string; resource?: string }>;
}) {
  const [{ subjectSlug, chapterSlug, sectionSlug }, queryParams] = await Promise.all([params, searchParams]);
  const section = getLibrarySection(sectionSlug);
  if (!section) notFound();
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
      : supabase.from('subjects').select('id, name, slug, color').eq('slug', subjectSlug).maybeSingle(),
  ]);
  const subject = subjectResult.data as { id: string; name: string; slug: string; color: string } | null;
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
    .select(
      'id, title, description, book_title, content_section, has_context_text, resource_type, drive_url, light_file_url, dark_file_url, board, grade_level, file_type, subjects(id, name, slug, color), chapters(id, name, slug, order_index)'
    )
    .eq('resource_type', resourceType)
    .eq('content_section', section.value)
    .order('title');
  resourcesQuery = subject ? resourcesQuery.eq('subject_id', subject.id) : resourcesQuery.is('subject_id', null);
  resourcesQuery = chapter ? resourcesQuery.eq('chapter_id', chapter.id) : resourcesQuery.is('chapter_id', null);
  if (bookTitle) resourcesQuery = resourcesQuery.eq('book_title', bookTitle);
  const catalogResult = await resourcesQuery;
  let resources = catalogResult.data;
  if (catalogResult.error) {
    console.warn('Structured library catalog is not migrated yet; using the safe legacy section fallback.');
    let fallbackQuery = (supabase.from('library_resources') as any)
      .select(
        'id, title, description, context_text_url, resource_type, drive_url, light_file_url, dark_file_url, board, grade_level, file_type, subjects(id, name, slug, color), chapters(id, name, slug, order_index)'
      )
      .eq('resource_type', resourceType)
      .order('title');
    fallbackQuery = subject ? fallbackQuery.eq('subject_id', subject.id) : fallbackQuery.is('subject_id', null);
    fallbackQuery = chapter ? fallbackQuery.eq('chapter_id', chapter.id) : fallbackQuery.is('chapter_id', null);
    const fallbackResult = await fallbackQuery;
    resources = (fallbackResult.data || [])
      .map(normalizeLegacyCatalogResource)
      .filter(
        (resource: any) =>
          resource.content_section === section.value && (!bookTitle || resource.book_title === bookTitle)
      );
  }
  const visibleResources = (resources || []).filter((resource: any) => isCatalogResourceVisible(resource, profile));
  const resolvedBookTitle =
    bookTitle ||
    visibleResources[0]?.book_title ||
    `${subject?.name || 'General'} ${resourceType === 'notes' ? 'Notes' : 'Text Book'}`;
  const catalogSearch = buildCatalogSearch(resourceType, resolvedBookTitle);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/library/${subjectSlug}/${chapterSlug}?${catalogSearch}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" /> Back to file sections
      </Link>

      <div className="border-border/70 bg-card/80 rounded-3xl border p-5 sm:p-7">
        <div className="flex flex-wrap gap-2">
          <Badge>{subject?.name || 'General'}</Badge>
          <Badge variant="outline">{chapter?.name || 'General Files'}</Badge>
          <Badge variant="secondary">{resolvedBookTitle}</Badge>
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{section.title}</h1>
        <p className="text-muted-foreground mt-2">This page contains only {section.title.toLowerCase()} files.</p>
      </div>

      {visibleResources.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleResources.map((resource: any) => (
            <GoogleDriveResourceCard
              key={resource.id}
              autoOpen={queryParams.resource === resource.id}
              resource={{
                id: resource.id,
                title: resource.title,
                description: resource.description,
                fileType: resource.file_type,
                bookTitle: resource.book_title,
                hasContextText: resource.has_context_text,
                subjectName: resource.subjects?.name,
                subjectColor: resource.subjects?.color,
                chapterName: resource.chapters?.name,
                driveUrl: resource.drive_url,
                lightFileUrl: resource.light_file_url,
                darkFileUrl: resource.dark_file_url,
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Files}
          title={`No ${section.title.toLowerCase()} file has been added yet`}
          description="Ask an admin to upload a PDF and companion TXT for this subject, chapter, and file section."
          primaryHref={`/library/${subjectSlug}/${chapterSlug}?${catalogSearch}`}
          primaryLabel="Choose another section"
        />
      )}
    </div>
  );
}
