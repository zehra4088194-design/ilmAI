import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getSiteUrl } from '@/lib/utils/siteUrl';
import { BLOG_POSTS } from '@/content/blog-posts';

export const revalidate = 3600;

export async function GET() {
  const db = createServiceClient();
  const [{ data: chapters }, { data: approvedResources }, { data: verifiedQuestions }] = await Promise.all([
    db
      .from('chapters')
      .select('id,name,slug,subject_id,subjects!inner(name,slug)')
      .eq('is_active', true)
      .not('slug', 'is', null),
    (db.from('library_resources') as any)
      .select('chapter_id,resource_type,content_section')
      .eq('importer_status', 'approved')
      .not('chapter_id', 'is', null),
    (db.from('questions') as any)
      .select('chapter_id')
      .eq('is_verified', true)
      .not('correct_answer', 'is', null)
      .not('chapter_id', 'is', null),
  ]);

  const supportedChapterIds = new Set<string>([
    ...(approvedResources || [])
      .map((row: { chapter_id: string | null }) => row.chapter_id)
      .filter(Boolean) as string[],
    ...(verifiedQuestions || [])
      .map((row: { chapter_id: string | null }) => row.chapter_id)
      .filter(Boolean) as string[],
  ]);

  const resourceMeta = new Map<string, Set<string>>();
  for (const row of approvedResources || []) {
    if (!row.chapter_id) continue;
    const set = resourceMeta.get(row.chapter_id) || new Set<string>();
    if (row.resource_type) set.add(row.resource_type);
    if (row.content_section) set.add(row.content_section);
    resourceMeta.set(row.chapter_id, set);
  }

  const baseUrl = getSiteUrl();
  const topics = (chapters || [])
    .filter((chapter: any) => chapter.slug && supportedChapterIds.has(chapter.id))
    .map((chapter: any) => {
      const subject = Array.isArray(chapter.subjects) ? chapter.subjects[0] : chapter.subjects;
      return {
        type: 'academic_topic',
        title: (subject?.name || 'Subject') + ' — ' + chapter.name,
        subject: subject?.name || null,
        chapter: chapter.name,
        url: baseUrl + '/topics/' + (subject?.slug || 'general') + '/' + chapter.slug,
        available_content: [...(resourceMeta.get(chapter.id) || [])],
      };
    });

  const staticPages = [
    { type: 'website', title: 'ilm AI', url: baseUrl },
    { type: 'study_topics', title: 'Public Study Topics', url: baseUrl + '/topics' },
    { type: 'library', title: 'Public Study Library', url: baseUrl + '/library' },
    { type: 'past_papers', title: 'Past Papers', url: baseUrl + '/past-papers' },
    { type: 'university_topics', title: 'University Study Topics', url: baseUrl + '/university-topics' },
    { type: 'study_guides', title: 'Study Guides', url: baseUrl + '/blog' },
    ...BLOG_POSTS.map((post) => ({
      type: 'study_guide',
      title: post.title,
      url: baseUrl + '/blog/' + post.slug,
    })),
  ];

  return NextResponse.json(
    {
      name: 'ilm AI public discovery catalog',
      description:
        'Machine-readable index of public ilm AI study pages. Use the linked pages for the complete subject, chapter, notes, question and study-guide context.',
      website: baseUrl,
      official_store: 'https://ilmai.store',
      updated_at: new Date().toISOString(),
      pages: staticPages,
      academic_topics: topics,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
