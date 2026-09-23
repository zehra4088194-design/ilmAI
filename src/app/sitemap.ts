import type { MetadataRoute } from 'next';
import { BLOG_POSTS } from '@/content/blog-posts';
import { getSiteUrl } from '@/lib/utils/siteUrl';
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
async function getAcademicEntries(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();
  const [{ data: topicRows }, { data: papers }] = await Promise.all([
    supabase
      .from('chapters')
      .select('id,slug,subject_id,subjects!inner(slug)')
      .eq('is_active', true)
      .not('slug', 'is', null),
    (supabase.from('past_papers') as any)
      .select('id,year,subject_id,chapter_id,subjects(slug),chapters(slug)')
      .eq('is_verified', true)
      .eq('extraction_status', 'approved')
      .not('subject_id', 'is', null),
  ]);

  const topics: MetadataRoute.Sitemap = [];
  for (const row of topicRows || []) {
    const subjectSlug = Array.isArray(row.subjects) ? row.subjects[0]?.slug : row.subjects?.slug;
    if (!subjectSlug || !row.slug) continue;
    topics.push({
      url: `${baseUrl}/topics/${subjectSlug}/${row.slug}`,
      changeFrequency: 'weekly',
      priority: 0.75,
    });
  }

  const paperEntries: MetadataRoute.Sitemap = [];
  for (const paper of papers || []) {
    const subjectSlug = Array.isArray(paper.subjects) ? paper.subjects[0]?.slug : paper.subjects?.slug;
    const chapterSlug = Array.isArray(paper.chapters) ? paper.chapters[0]?.slug : paper.chapters?.slug;
    if (!subjectSlug) continue;
    paperEntries.push({
      url: `${baseUrl}/past-papers/${subjectSlug}/${chapterSlug || 'full-syllabus'}/${paper.id}`,
      lastModified: paper.year ? new Date(`${paper.year}-01-01T00:00:00Z`) : undefined,
      changeFrequency: 'yearly',
      priority: 0.55,
    });
  }

  return [...topics, ...paperEntries];
}

async function getLibraryEntries(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();
  const [{ data: subjects }, { data: resources }] = await Promise.all([
    supabase.from('subjects').select('slug').not('slug', 'is', null),
    (supabase.from('library_resources') as any)
      .select('subject_id, chapter_id, subjects(slug), chapters(slug)')
      .not('subject_id', 'is', null)
      .not('chapter_id', 'is', null),
  ]);

  const subjectEntries: MetadataRoute.Sitemap = (subjects || []).map((subject: { slug: string }) => ({
    url: `${baseUrl}/library/${subject.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Resources are seeded MANY-per-chapter (one row per MCQ set, short questions, long questions,
  // reading, etc.) — dedupe down to one sitemap entry per subject+chapter combination, which is
  // the actual page URL (query params like ?type=mcqs pick a view within it, not a separate page).
  const seenChapters = new Set<string>();
  const chapterEntries: MetadataRoute.Sitemap = [];
  for (const resource of resources || []) {
    const subjectSlug = resource.subjects?.slug;
    const chapterSlug = resource.chapters?.slug;
    if (!subjectSlug || !chapterSlug) continue;
    const key = `${subjectSlug}/${chapterSlug}`;
    if (seenChapters.has(key)) continue;
    seenChapters.add(key);
    chapterEntries.push({
      url: `${baseUrl}/library/${subjectSlug}/${chapterSlug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    });
  }

  return [...subjectEntries, ...chapterEntries];
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
