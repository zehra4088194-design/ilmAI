import type { MetadataRoute } from 'next';
import { BLOG_POSTS } from '@/content/blog-posts';
import { getSiteUrl } from '@/lib/utils/siteUrl';
import { slugifyBookTitle } from '@/lib/resources/catalog';
import { createServiceClient } from '@/lib/supabase/service';

const STATIC_ROUTES = [
  { path: '', priority: 1, changeFrequency: 'weekly' as const },
  { path: '/features/notes', priority: 0.95, changeFrequency: 'monthly' as const },
  { path: '/features/lectures', priority: 0.95, changeFrequency: 'monthly' as const },
  { path: '/features/ai-tutor', priority: 0.95, changeFrequency: 'monthly' as const },
  { path: '/features/presentation-builder', priority: 0.95, changeFrequency: 'monthly' as const },
  { path: '/features/scan', priority: 0.9, changeFrequency: 'monthly' as const },
  { path: '/features/doubts', priority: 0.9, changeFrequency: 'monthly' as const },
  { path: '/about', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/pricing', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/library', priority: 0.95, changeFrequency: 'weekly' as const },
  { path: '/past-papers', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/colleges', priority: 0.6, changeFrequency: 'weekly' as const },
  { path: '/topics', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/university-topics', priority: 0.75, changeFrequency: 'weekly' as const },
  { path: '/contact', priority: 0.4, changeFrequency: 'yearly' as const },
  { path: '/help', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' as const },
  { path: '/terms', priority: 0.4, changeFrequency: 'yearly' as const },
  { path: '/cookies', priority: 0.4, changeFrequency: 'yearly' as const },
  { path: '/refund-policy', priority: 0.4, changeFrequency: 'yearly' as const },
  { path: '/status', priority: 0.5, changeFrequency: 'daily' as const },
];

// Library (and Past Papers, once it has content) are public, no-signup-required, read-only
// pages — see the middleware comment on PROTECTED_PREFIXES: they're deliberately left out of the
// auth-gated route list for exactly this reason. Before this, only the generic top-level
// `/library` URL was in the sitemap; Google Search Console had nothing to actually index for a
// student's real search ("class 9 biology chapter 3 mcqs") because the per-subject and
// per-chapter pages that content lives on were never listed anywhere for a crawler to discover.

async function fetchAllRows<T>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryFactory(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchAllLibraryResourceRows(supabase: ReturnType<typeof createServiceClient>) {
  // PostgREST defaults to a 1000-row cap. Without explicit pagination the sitemap silently
  // omitted later resources (and their chapters/books) once the catalog grew past that limit.
  return fetchAllRows<{
    subject_id: string | null;
    chapter_id: string | null;
    book_title: string | null;
    resource_type: string | null;
    subjects?: { slug: string } | null;
    chapters?: { slug: string } | null;
  }>((from, to) =>
    (supabase.from('library_resources') as any)
      .select('subject_id, chapter_id, book_title, resource_type, subjects(slug), chapters(slug)')
      .not('subject_id', 'is', null)
      .order('created_at', { ascending: true })
      .range(from, to)
  );
}

async function getAcademicEntries(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();
  const [{ data: topicRows }, { data: publicResources }, { data: questions }, { data: papers }, { data: universityLinks }] = await Promise.all([
    supabase
      .from('chapters')
      .select('id,slug,subject_id,subjects!inner(slug)')
      .eq('is_active', true)
      .not('slug', 'is', null),
    (supabase.from('library_resources') as any)
      .select('chapter_id')
      .eq('importer_status', 'approved')
      .not('chapter_id', 'is', null),
    (supabase.from('questions') as any)
      .select('chapter_id')
      .eq('is_verified', true)
      .not('correct_answer', 'is', null)
      .not('chapter_id', 'is', null),
    (supabase.from('past_papers') as any)
      .select('id,year,subject_id,chapter_id,created_at,subjects(slug),chapters(slug)')
      .eq('is_verified', true)
      .eq('extraction_status', 'approved')
      .not('subject_id', 'is', null),
    (supabase.from('university_program_year_subjects') as any)
      .select('program_year_id,subject_id')
      .order('sort_order'),
  ]);

  const supportedChapterIds = new Set<string>([
    ...(publicResources || []).map((row: { chapter_id: string | null }) => row.chapter_id).filter(Boolean) as string[],
    ...(questions || []).map((row: { chapter_id: string | null }) => row.chapter_id).filter(Boolean) as string[],
  ]);
  const topics: MetadataRoute.Sitemap = [];
  for (const row of topicRows || []) {
    const subjectRelation = (row as any).subjects;
    const subjectSlug = Array.isArray(subjectRelation) ? subjectRelation[0]?.slug : subjectRelation?.slug;
    if (!subjectSlug || !row.slug || !supportedChapterIds.has(row.id)) continue;
    topics.push({
      url: `${baseUrl}/topics/${subjectSlug}/${row.slug}`,
      changeFrequency: 'weekly',
      priority: 0.75,
    });
  }

  const paperEntries: MetadataRoute.Sitemap = [];

  // University topic URLs are built from scalar IDs first, then resolved to the
  // semantic program slug. This avoids assuming nested PostgREST relation names.
  const universityTopicEntries: MetadataRoute.Sitemap = [];
  if (universityLinks?.length) {
    const yearIds = [...new Set(universityLinks.map((row: { program_year_id: string }) => row.program_year_id))];
    const subjectIds = [...new Set(universityLinks.map((row: { subject_id: string }) => row.subject_id))];
    const [{ data: universityYears }, { data: universitySubjects }] = await Promise.all([
      (supabase.from('university_program_years') as any).select('id,program_id').in('id', yearIds),
      (supabase.from('university_subjects') as any).select('id,is_active').in('id', subjectIds).eq('is_active', true),
    ]);
    const programIds = [...new Set((universityYears || []).map((row: { program_id: string }) => row.program_id))];
    const { data: universityPrograms } = await (supabase.from('university_degree_programs') as any)
      .select('id,slug,is_active')
      .in('id', programIds)
      .eq('is_active', true);
    const validSubjects = new Set((universitySubjects || []).map((row: { id: string }) => row.id));
    const programSlugById = new Map((universityPrograms || []).map((row: { id: string; slug: string }) => [row.id, row.slug]));
    const programIdByYearId = new Map((universityYears || []).map((row: { id: string; program_id: string }) => [row.id, row.program_id]));
    const seen = new Set<string>();
    for (const link of universityLinks || []) {
      if (!validSubjects.has(link.subject_id)) continue;
      const programId = programIdByYearId.get(link.program_year_id);
      const programSlug = programId ? programSlugById.get(programId) : null;
      if (!programSlug) continue;
      const key = `${programSlug}/${link.program_year_id}/${link.subject_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      universityTopicEntries.push({
        url: `${baseUrl}/university-topics/${key}`,
        changeFrequency: 'weekly',
        priority: 0.65,
      });
    }
  }
  for (const paper of papers || []) {
    const paperSubjectRelation = (paper as any).subjects;
    const paperChapterRelation = (paper as any).chapters;
    const subjectSlug = Array.isArray(paperSubjectRelation) ? paperSubjectRelation[0]?.slug : paperSubjectRelation?.slug;
    const chapterSlug = Array.isArray(paperChapterRelation) ? paperChapterRelation[0]?.slug : paperChapterRelation?.slug;
    if (!subjectSlug) continue;
    paperEntries.push({
      url: `${baseUrl}/past-papers/${subjectSlug}/${chapterSlug || 'full-syllabus'}/${paper.id}`,
      lastModified: paper.created_at ? new Date(paper.created_at) : undefined,
      changeFrequency: 'yearly',
      priority: 0.55,
    });
  }

  return [...topics, ...paperEntries, ...universityTopicEntries];
}

async function getLibraryEntries(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();
  const [{ data: subjects }, resources] = await Promise.all([
    supabase.from('subjects').select('slug').not('slug', 'is', null),
    fetchAllLibraryResourceRows(supabase),
  ]);

  const subjectEntries: MetadataRoute.Sitemap = (subjects || []).map((subject: { slug: string }) => ({
    url: `${baseUrl}/library/${subject.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Resources are seeded MANY-per-chapter — dedupe to one entry per subject+chapter.
  // Rows with null chapter_id still contribute book landing pages below.
  const seenChapters = new Set<string>();
  const chapterEntries: MetadataRoute.Sitemap = [];
  const seenBooks = new Set<string>();
  const bookEntries: MetadataRoute.Sitemap = [];

  for (const resource of resources) {
    const subjectSlug = resource.subjects?.slug;
    if (!subjectSlug) continue;

    const chapterSlug = resource.chapters?.slug;
    if (chapterSlug) {
      const chapterKey = `${subjectSlug}/${chapterSlug}`;
      if (!seenChapters.has(chapterKey)) {
        seenChapters.add(chapterKey);
        chapterEntries.push({
          url: `${baseUrl}/library/${subjectSlug}/${chapterSlug}`,
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        });
      }
    }

    const bookTitle = resource.book_title?.trim();
    if (bookTitle) {
      const bookSlug = slugifyBookTitle(bookTitle);
      const bookKey = `${subjectSlug}/books/${bookSlug}`;
      if (!seenBooks.has(bookKey)) {
        seenBooks.add(bookKey);
        bookEntries.push({
          url: `${baseUrl}/library/${subjectSlug}/books/${bookSlug}`,
          changeFrequency: 'weekly' as const,
          priority: 0.65,
        });
      }
    }
  }

  return [...subjectEntries, ...bookEntries, ...chapterEntries];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const staticLastModified = new Date('2026-08-02T00:00:00Z');

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: staticLastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const articleEntries: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(`${post.updatedAt}T00:00:00Z`),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  // Best-effort — a DB hiccup here should never take down the whole sitemap (and every other
  // static/blog URL with it), it should just mean this run has fewer library URLs than usual.
  const libraryEntries = await getLibraryEntries(baseUrl).catch((error) => {
    console.error('[sitemap] Failed to load library entries:', error);
    return [];
  });

  const academicEntries = await getAcademicEntries(baseUrl).catch((error) => {
    console.error('[sitemap] Failed to load academic entries:', error);
    return [];
  });

  return [...staticEntries, ...articleEntries, ...libraryEntries, ...academicEntries];
}
