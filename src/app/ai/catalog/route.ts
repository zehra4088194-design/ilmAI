import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getSiteUrl } from '@/lib/utils/siteUrl';
import { BLOG_POSTS } from '@/content/blog-posts';

export const revalidate = 3600;

export async function GET() {
  const db = createServiceClient();
  const [
    { data: chapters },
    { data: approvedResources },
    { data: verifiedQuestions },
    { data: verifiedPapers },
    { data: universityLinks },
  ] = await Promise.all([
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
    (db.from('past_papers') as any)
      .select('id,year,paper_type,subject_id,chapter_id,subjects(slug,name),chapters(slug,name)')
      .eq('is_verified', true)
      .eq('extraction_status', 'approved')
      .not('subject_id', 'is', null)
      .order('year', { ascending: false }),
    (db.from('university_program_year_subjects') as any)
      .select('program_year_id,subject_id')
      .order('sort_order'),
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
    { type: 'store', title: 'Official IlmAI Store', url: 'https://ilmai.store' },
    ...BLOG_POSTS.map((post) => ({
      type: 'study_guide',
      title: post.title,
      url: baseUrl + '/blog/' + post.slug,
    })),
  ];

  const paperPages = (verifiedPapers || []).map((paper: any) => {
    const subject = Array.isArray(paper.subjects) ? paper.subjects[0] : paper.subjects;
    const chapter = Array.isArray(paper.chapters) ? paper.chapters[0] : paper.chapters;
    return {
      type: 'past_paper',
      title:
        (subject?.name || 'Past Paper') +
        ' ' +
        paper.year +
        ' ' +
        String(paper.paper_type || 'Past Paper').replaceAll('_', ' '),
      url:
        baseUrl +
        '/past-papers/' +
        (subject?.slug || 'general') +
        '/' +
        (chapter?.slug || 'full-syllabus') +
        '/' +
        paper.id,
    };
  });

  const yearIds = [...new Set((universityLinks || []).map((row: any) => row.program_year_id))];
  const subjectIds = [...new Set((universityLinks || []).map((row: any) => row.subject_id))];

  let universityPages: Array<{ type: string; title: string; url: string }> = [];
  if (yearIds.length && subjectIds.length) {
    const [{ data: years }, { data: subjects }] = await Promise.all([
      (db.from('university_program_years') as any).select('id,label,program_id').in('id', yearIds),
      (db.from('university_subjects') as any).select('id,name').in('id', subjectIds).eq('is_active', true),
    ]);
    const programIds = [...new Set((years || []).map((row: any) => row.program_id))];
    const { data: programs } = programIds.length
      ? await (db.from('university_degree_programs') as any)
          .select('id,slug,name')
          .in('id', programIds)
          .eq('is_active', true)
      : { data: [] };

    const yearById = new Map((years || []).map((row: any) => [row.id, row]));
    const subjectById = new Map((subjects || []).map((row: any) => [row.id, row]));
    const programById = new Map((programs || []).map((row: any) => [row.id, row]));

    universityPages = (universityLinks || []).flatMap((link: any) => {
      const year = yearById.get(link.program_year_id);
      const subject = subjectById.get(link.subject_id);
      const program = year ? programById.get(year.program_id) : null;
      if (!year || !subject || !program) return [];
      return [{
        type: 'university_topic',
        title: subject.name + ' — ' + program.name + ' ' + year.label,
        url: baseUrl + '/university-topics/' + program.slug + '/' + year.id + '/' + subject.id,
      }];
    });
  }

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
      university_topics: universityPages,
      past_papers: paperPages,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
