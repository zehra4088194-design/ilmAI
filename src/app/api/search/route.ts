import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim() || '';
  if (query.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [
    { data: subjects },
    { data: chapters },
    { data: resources },
    { data: lectures },
    { data: notes },
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
      .select('id, title, resource_type, subjects(name), chapters(name)')
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('lectures')
      .select('id, title, chapters(name, subjects(name))')
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
  const resourceResults = (resources || []).map((resource: any) => ({
    id: resource.id,
    type: 'resource' as const,
    name: resource.title,
    subtitle: resource.subjects?.name
      ? `${resource.subjects.name} - ${resource.resource_type || 'Resource'}`
      : resource.resource_type || 'Library resource',
    href: `/library?search=${encodeURIComponent(resource.title)}&type=${resource.resource_type === 'notes' ? 'notes' : 'text_book'}`,
  }));
  const lectureResults = (lectures || []).map((lecture: any) => ({
    id: lecture.id,
    type: 'lecture' as const,
    name: lecture.title,
    subtitle: lecture.chapters?.subjects?.name ? `Lecture - ${lecture.chapters.subjects.name}` : 'Video lecture',
    href: `/lectures?search=${encodeURIComponent(lecture.title)}`,
  }));
  const noteResults = (notes || []).map((note: any) => ({
    id: note.id,
    type: 'note' as const,
    name: note.title,
    subtitle: 'My note',
    href: `/notes?search=${encodeURIComponent(note.title)}`,
  }));
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
      ...collegeLectureResults,
      ...collegeResourceResults,
    ].slice(0, 20),
  });
}
