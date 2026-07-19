import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchAlgoliaCatalog } from '@/lib/search/algolia';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim() || '';
  if (query.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const algoliaResults = await searchAlgoliaCatalog(query);
  if (algoliaResults) {
    const [{ data: notes }, { data: collegeLectures }, { data: collegeResources }] = await Promise.all([
      user
        ? supabase
            .from('notes')
            .select('id, title')
            .eq('user_id', user.id)
            .ilike('title', `%${query}%`)
            .order('updated_at', { ascending: false })
            .limit(8)
        : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
      supabase
        .from('college_lectures')
        .select('id, title, course_name, chapter_title')
        .ilike('title', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('college_resources')
        .select('id, title, resource_type, course_name, chapter_title')
        .ilike('title', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);
    return NextResponse.json({
      results: [
        ...algoliaResults.map(({ objectID: _objectID, ...result }) => result),
        ...(notes || []).map((note) => ({
          id: note.id,
          type: 'note' as const,
          name: note.title,
          subtitle: 'My note',
          href: `/notes?search=${encodeURIComponent(note.title)}`,
        })),
        ...(collegeLectures || []).map((lecture) => ({
          id: lecture.id,
          type: 'lecture' as const,
          name: lecture.title,
          subtitle: [lecture.course_name, lecture.chapter_title].filter(Boolean).join(' - ') || 'College lecture',
          href: `/college/dashboard?search=${encodeURIComponent(lecture.title)}`,
        })),
        ...(collegeResources || []).map((resource) => ({
          id: resource.id,
          type: 'resource' as const,
          name: resource.title,
          subtitle:
            [resource.course_name, resource.chapter_title, resource.resource_type].filter(Boolean).join(' - ') ||
            'College resource',
          href: `/college/dashboard?search=${encodeURIComponent(resource.title)}`,
        })),
      ].slice(0, 20),
    });
  }
  const [
    { data: subjects },
    { data: chapters },
    { data: resources },
    { data: lectures },
    { data: notes },
    { data: pastPapers },
    { data: collegeLectures },
    { data: collegeResources },
  ] = await Promise.all([
    supabase
      .from('subjects')
      .select('id, name, slug')
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(8),
    supabase
      .from('chapters')
      .select('id, name, slug, subjects(id, name, slug)')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(8),
    supabase
      .from('library_resources')
      .select('id, title, resource_type, book_title, content_section, subjects(name, slug), chapters(name, slug)')
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('lectures')
      .select('id, title, chapters(name, slug, subjects(name, slug))')
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(8),
    user
      ? supabase
          .from('notes')
          .select('id, title')
          .eq('user_id', user.id)
          .ilike('title', `%${query}%`)
          .order('updated_at', { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    supabase
      .from('past_papers')
      .select('id, year, paper_type, subjects(name, slug), chapters(name, slug)')
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('college_lectures')
      .select('id, title, course_name, chapter_title')
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('college_resources')
      .select('id, title, resource_type, course_name, chapter_title')
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const subjectResults = (subjects || []).map((subject) => ({
    id: subject.id,
    type: 'subject' as const,
    name: subject.name,
    subtitle: 'Subject',
    href: `/study/${subject.slug}`,
  }));
  const chapterResults = (chapters || []).map((chapter: any) => ({
    id: chapter.id,
    type: 'chapter' as const,
    name: chapter.name,
    subtitle: chapter.subjects?.name ? `Chapter in ${chapter.subjects.name}` : 'Chapter',
    href: chapter.subjects?.slug ? `/study/${chapter.subjects.slug}/${chapter.slug}` : '/study',
  }));
  const resourceResults = (resources || []).map((resource: any) => {
    const resourceType = resource.resource_type === 'notes' ? 'notes' : 'text_book';
    const params = new URLSearchParams({ type: resourceType, resource: resource.id });
    if (resource.book_title) params.set('book', resource.book_title);
    return {
      id: resource.id,
      type: 'resource' as const,
      name: resource.title,
      subtitle: resource.subjects?.name
        ? `${resource.subjects.name} - ${resource.resource_type || 'Resource'}`
        : resource.resource_type || 'Library resource',
      // Search should land on the book/chapter catalog first so the visitor
      // can choose reading, MCQs, short, or long files intentionally.
      href: `/library/${resource.subjects?.slug || 'general'}?${params}`,
    };
  });
  const lectureResults = (lectures || []).map((lecture: any) => ({
    id: lecture.id,
    type: 'lecture' as const,
    name: lecture.title,
    subtitle: lecture.chapters?.subjects?.name ? `Lecture - ${lecture.chapters.subjects.name}` : 'Video lecture',
    href:
      lecture.chapters?.subjects?.slug && lecture.chapters?.slug
        ? `/lectures/${lecture.chapters.subjects.slug}/${lecture.chapters.slug}?lecture=${encodeURIComponent(lecture.id)}`
        : `/lectures?search=${encodeURIComponent(lecture.title)}`,
  }));
  const noteResults = (notes || []).map((note: any) => ({
    id: note.id,
    type: 'note' as const,
    name: note.title,
    subtitle: 'My note',
    href: `/notes?search=${encodeURIComponent(note.title)}`,
  }));
  const normalizedQuery = query.toLocaleLowerCase();
  const pastPaperResults = (pastPapers || [])
    .map((paper: any) => {
      const subjectName = paper.subjects?.name || 'General';
      const chapterName = paper.chapters?.name || 'Full Syllabus';
      const title = `${subjectName} ${paper.year} ${String(paper.paper_type || 'Past Paper').replaceAll('_', ' ')}`;
      const searchable = `${title} ${chapterName}`.toLocaleLowerCase();
      return {
        matches: searchable.includes(normalizedQuery),
        result: {
          id: paper.id,
          type: 'past-paper' as const,
          name: title,
          subtitle: `${chapterName} - Past paper`,
          href: `/past-papers/${paper.subjects?.slug || 'general'}/${paper.chapters?.slug || 'full-syllabus'}/${paper.id}`,
        },
      };
    })
    .filter((item) => item.matches)
    .map((item) => item.result)
    .slice(0, 8);
  const collegeLectureResults = (collegeLectures || []).map((lecture: any) => ({
    id: lecture.id,
    type: 'lecture' as const,
    name: lecture.title,
    subtitle: [lecture.course_name, lecture.chapter_title].filter(Boolean).join(' - ') || 'College lecture',
    href: `/college/dashboard?search=${encodeURIComponent(lecture.title)}`,
  }));
  const collegeResourceResults = (collegeResources || []).map((resource: any) => ({
    id: resource.id,
    type: 'resource' as const,
    name: resource.title,
    subtitle:
      [resource.course_name, resource.chapter_title, resource.resource_type].filter(Boolean).join(' - ') ||
      'College resource',
    href: `/college/dashboard?search=${encodeURIComponent(resource.title)}`,
  }));

  return NextResponse.json({
    results: [
      ...subjectResults,
      ...chapterResults,
      ...resourceResults,
      ...lectureResults,
      ...noteResults,
      ...pastPaperResults,
      ...collegeLectureResults,
      ...collegeResourceResults,
    ].slice(0, 20),
  });
}
