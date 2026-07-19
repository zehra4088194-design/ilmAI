import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { replaceAlgoliaCatalog, type ExternalSearchResult } from '@/lib/search/algolia';

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.ALGOLIA_ADMIN_API_KEY || !process.env.ALGOLIA_APP_ID) {
    return NextResponse.json({ error: 'Algolia is not configured.' }, { status: 503 });
  }

  const admin = (await createAdminClient()) as any;
  const [subjectsResult, chaptersResult, resourcesResult, lecturesResult, papersResult] = await Promise.all([
    admin.from('subjects').select('id, name, slug').eq('is_active', true).limit(1000),
    admin.from('chapters').select('id, name, slug, subjects(name, slug)').limit(1000),
    admin
      .from('library_resources')
      .select('id, title, resource_type, book_title, subjects(name, slug)')
      .limit(1000),
    admin.from('lectures').select('id, title, chapters(name, slug, subjects(name, slug))').limit(1000),
    admin.from('past_papers').select('id, year, paper_type, subjects(name, slug), chapters(name, slug)').limit(1000),
  ]);
  const firstError = [subjectsResult, chaptersResult, resourcesResult, lecturesResult, papersResult].find(
    (result) => result.error
  )?.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const records: ExternalSearchResult[] = [];
  for (const subject of subjectsResult.data || []) {
    records.push({
      objectID: `subject:${subject.id}`,
      id: subject.id,
      type: 'subject',
      name: subject.name,
      subtitle: 'Subject',
      href: `/study/${subject.slug}`,
    });
  }
  for (const chapter of chaptersResult.data || []) {
    records.push({
      objectID: `chapter:${chapter.id}`,
      id: chapter.id,
      type: 'chapter',
      name: chapter.name,
      subtitle: chapter.subjects?.name ? `Chapter in ${chapter.subjects.name}` : 'Chapter',
      href: chapter.subjects?.slug ? `/study/${chapter.subjects.slug}/${chapter.slug}` : '/study',
    });
  }
  for (const resource of resourcesResult.data || []) {
    const params = new URLSearchParams({
      type: resource.resource_type === 'notes' ? 'notes' : 'text_book',
      resource: resource.id,
    });
    if (resource.book_title) params.set('book', resource.book_title);
    records.push({
      objectID: `resource:${resource.id}`,
      id: resource.id,
      type: 'resource',
      name: resource.title,
      subtitle: resource.subjects?.name
        ? `${resource.subjects.name} - ${resource.resource_type || 'Resource'}`
        : resource.resource_type || 'Library resource',
      href: `/library/${resource.subjects?.slug || 'general'}?${params}`,
    });
  }
  for (const lecture of lecturesResult.data || []) {
    records.push({
      objectID: `lecture:${lecture.id}`,
      id: lecture.id,
      type: 'lecture',
      name: lecture.title,
      subtitle: lecture.chapters?.subjects?.name ? `Lecture - ${lecture.chapters.subjects.name}` : 'Video lecture',
      href:
        lecture.chapters?.subjects?.slug && lecture.chapters?.slug
          ? `/lectures/${lecture.chapters.subjects.slug}/${lecture.chapters.slug}?lecture=${encodeURIComponent(lecture.id)}`
          : `/lectures?search=${encodeURIComponent(lecture.title)}`,
    });
  }
  for (const paper of papersResult.data || []) {
    const subjectName = paper.subjects?.name || 'General';
    const chapterName = paper.chapters?.name || 'Full Syllabus';
    records.push({
      objectID: `past-paper:${paper.id}`,
      id: paper.id,
      type: 'past-paper',
      name: `${subjectName} ${paper.year} ${String(paper.paper_type || 'Past Paper').replaceAll('_', ' ')}`,
      subtitle: `${chapterName} - Past paper`,
      href: `/past-papers/${paper.subjects?.slug || 'general'}/${paper.chapters?.slug || 'full-syllabus'}/${paper.id}`,
    });
  }

  await replaceAlgoliaCatalog(records);
  return NextResponse.json({ status: 'success', indexed: records.length });
}
