import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { searchAlgoliaCatalog } from '@/lib/search/algolia';
import { isCurriculumEnabled } from '@/lib/features/curriculum';


async function searchPublicTopicContent(query: string) {
  const db = createServiceClient() as any;
  const { data, error } = await db.rpc('search_public_topic_content', { p_query: query, p_limit: 10 });
  if (error) {
    console.warn('[search] Public topic-content search unavailable:', error);
    return [] as any[];
  }
  return Array.isArray(data) ? data : [];
}

function mapPublicTopicContent(rows: any[], gradeLevel: string, strictGradeLevel = false) {
  const seen = new Set<string>();
  return rows
    .filter((row) => !gradeLevel || (strictGradeLevel ? row.grade_level === gradeLevel : !row.grade_level || row.grade_level === gradeLevel))
    .map((row) => {
      const href = row.subject_slug && row.chapter_slug
        ? `/topics/${row.subject_slug}/${row.chapter_slug}`
        : row.subject_slug
          ? `/topics/${row.subject_slug}`
          : '/topics';
      return {
        id: `${row.resource_id}-${row.subject_slug}-${row.chapter_slug || 'subject'}`,
        type: 'study-topic' as const,
        name: row.chapter_name ? `${row.subject_name} — ${row.chapter_name}` : row.subject_name || 'Study topic',
        subtitle: [row.resource_title, row.content_section, row.grade_level].filter(Boolean).join(' · ') || 'Public study material',
        href,
      };
    })
    .filter((row) => {
      if (seen.has(row.href)) return false;
      seen.add(row.href);
      return true;
    });
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim() || '';
  const requestedGradeLevel = req.nextUrl.searchParams.get('gradeLevel')?.trim() || '';
  const strictGradeLevel = req.nextUrl.searchParams.get('strictGradeLevel') === '1';
  if (query.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // For strict side-chat searches, the server owns the class scope. Do not
  // trust a client-provided grade because stale/partial auth state can be
  // undefined or out of date.
  let gradeLevel = requestedGradeLevel;
  if (strictGradeLevel) {
    if (!user?.id) return NextResponse.json({ results: [] });
    const { data: profile } = await supabase
      .from('profiles')
      .select('grade_level')
      .eq('id', user.id)
      .maybeSingle();
    gradeLevel = typeof profile?.grade_level === 'string' ? profile.grade_level.trim() : '';
    if (!gradeLevel) return NextResponse.json({ results: [] });
  }
  // Algolia's public index is not guaranteed to contain grade facets. Use the
  // relational catalog whenever a class is selected so other classes cannot
  // leak into navbar/side-chat results.
  const curriculumEnabled = await isCurriculumEnabled();
  const filterDisabledCurriculum = <T extends { href?: string }>(results: T[]) =>
    curriculumEnabled
      ? results
      : results.filter(
          (item) => !item.href?.startsWith('/curriculum') && !item.href?.startsWith('/smart-book-practice')
        );

  const publicTopicContentPromise = searchPublicTopicContent(query);
  const algoliaResults = gradeLevel ? null : await searchAlgoliaCatalog(query);
  if (algoliaResults) {
    const publicTopicResults = mapPublicTopicContent(await publicTopicContentPromise, gradeLevel, strictGradeLevel);
    const [{ data: notes }, { data: collegeLectures }, { data: collegeResources }] = await Promise.all([
      user
        ? supabase
            .from('notes')
            .select(
              'id, title, subject:subjects!notes_subject_id_fkey(grade_levels), chapter:chapters!notes_chapter_id_fkey(grade_levels)'
            )
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
      createServiceClient()
        .from('college_resources')
        .select('id, title, resource_type, course_name, chapter_title')
        .ilike('title', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);
    return NextResponse.json({
      results: filterDisabledCurriculum([
        ...publicTopicResults,
        ...algoliaResults.map(({ objectID: _objectID, ...result }) => result),
        ...(notes || [])
          .filter(
            (note: any) =>
              !gradeLevel ||
              note.subject?.grade_levels?.includes(gradeLevel) ||
              note.chapter?.grade_levels?.includes(gradeLevel)
          )
          .map((note) => ({
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
      ]).slice(0, 20),
    });
  }
  let subjectsQuery = supabase
    .from('subjects')
    .select('id, name, slug, grade_levels')
    .eq('is_active', true)
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(8);
  if (gradeLevel) subjectsQuery = subjectsQuery.contains('grade_levels', [gradeLevel]);

  let chaptersQuery = supabase
    .from('chapters')
    .select('id, name, slug, grade_levels, subjects(id, name, slug, grade_levels)')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(8);
  if (gradeLevel) chaptersQuery = chaptersQuery.contains('grade_levels', [gradeLevel]);

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
    subjectsQuery,
    chaptersQuery,
    createServiceClient()
      .from('library_resources')
      .select(
        'id, title, resource_type, book_title, content_section, subjects(name, slug, grade_levels), chapters(name, slug, grade_levels)'
      )
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('lectures')
      .select('id, title, chapters(name, slug, grade_levels, subjects(name, slug, grade_levels))')
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(8),
    user
      ? supabase
          .from('notes')
          .select(
            'id, title, subject:subjects!notes_subject_id_fkey(grade_levels), chapter:chapters!notes_chapter_id_fkey(grade_levels)'
          )
          .eq('user_id', user.id)
          .ilike('title', `%${query}%`)
          .order('updated_at', { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    createServiceClient()
      .from('past_papers')
      .select('id, year, paper_type, subjects(name, slug, grade_levels), chapters(name, slug, grade_levels)')
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('college_lectures')
      .select('id, title, course_name, chapter_title')
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(8),
    createServiceClient()
      .from('college_resources')
      .select('id, title, resource_type, course_name, chapter_title')
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);
  const matchesGrade = (item: any) =>
    !gradeLevel ||
    item.grade_levels?.includes(gradeLevel) ||
    item.subjects?.grade_levels?.includes(gradeLevel) ||
    item.chapters?.grade_levels?.includes(gradeLevel) ||
    item.chapters?.subjects?.grade_levels?.includes(gradeLevel);

  const subjectResults = (subjects || []).filter(matchesGrade).map((subject) => ({
    id: subject.id,
    type: 'subject' as const,
    name: subject.name,
    subtitle: 'Subject',
    href: `/study/${subject.slug}`,
  }));
  const chapterResults = (chapters || []).filter(matchesGrade).map((chapter: any) => ({
    id: chapter.id,
    type: 'chapter' as const,
    name: chapter.name,
    subtitle: chapter.subjects?.name ? `Chapter in ${chapter.subjects.name}` : 'Chapter',
    href: chapter.subjects?.slug ? `/study/${chapter.subjects.slug}/${chapter.slug}` : '/study',
  }));
  const resourceResults = (resources || []).filter(matchesGrade).map((resource: any) => {
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
      href: resource.subjects?.slug && resource.chapters?.slug
        ? `/topics/${resource.subjects.slug}/${resource.chapters.slug}`
        : `/library/${resource.subjects?.slug || 'general'}?${params}`,
    };
  });
  const lectureResults = (lectures || []).filter(matchesGrade).map((lecture: any) => ({
    id: lecture.id,
    type: 'lecture' as const,
    name: lecture.title,
    subtitle: lecture.chapters?.subjects?.name ? `Lecture - ${lecture.chapters.subjects.name}` : 'Video lecture',
    href:
      lecture.chapters?.subjects?.slug && lecture.chapters?.slug
        ? `/lectures/${lecture.chapters.subjects.slug}/${lecture.chapters.slug}?lecture=${encodeURIComponent(lecture.id)}`
        : `/lectures?search=${encodeURIComponent(lecture.title)}`,
  }));
  const noteResults = (notes || []).filter(matchesGrade).map((note: any) => ({
    id: note.id,
    type: 'note' as const,
    name: note.title,
    subtitle: 'My note',
    href: `/notes?search=${encodeURIComponent(note.title)}`,
  }));
  const normalizedQuery = query.toLocaleLowerCase();
  const pastPaperResults = (pastPapers || [])
    .filter(matchesGrade)
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
  const collegeLectureResults = gradeLevel
    ? []
    : (collegeLectures || []).map((lecture: any) => ({
        id: lecture.id,
        type: 'lecture' as const,
        name: lecture.title,
        subtitle: [lecture.course_name, lecture.chapter_title].filter(Boolean).join(' - ') || 'College lecture',
        href: `/college/dashboard?search=${encodeURIComponent(lecture.title)}`,
      }));
  const collegeResourceResults = gradeLevel
    ? []
    : (collegeResources || []).map((resource: any) => ({
        id: resource.id,
        type: 'resource' as const,
        name: resource.title,
        subtitle:
          [resource.course_name, resource.chapter_title, resource.resource_type].filter(Boolean).join(' - ') ||
          'College resource',
        href: `/college/dashboard?search=${encodeURIComponent(resource.title)}`,
      }));

  const publicTopicResults = mapPublicTopicContent(await publicTopicContentPromise, gradeLevel);

  return NextResponse.json({
    results: filterDisabledCurriculum([
      ...publicTopicResults,
      ...subjectResults,
      ...chapterResults,
      ...resourceResults,
      ...lectureResults,
      ...noteResults,
      ...pastPaperResults,
      ...collegeLectureResults,
      ...collegeResourceResults,
    ]).slice(0, 20),
  });
}
