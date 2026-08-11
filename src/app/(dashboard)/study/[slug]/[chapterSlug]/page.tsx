import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookMarked, FileQuestion, FileText, ListChecks } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { Card, CardContent } from '@/components/ui/card';
import { LectureGrid, type StudyLecture } from '@/components/features/study/LectureGrid';
import { LIBRARY_SECTIONS } from '@/lib/resources/catalog';
import { loadStudyCatalogResources, loadStudySubjectResources } from '@/lib/resources/study-catalog';
import type { Board, GradeLevel } from '@/types';

const SECTION_ICONS = {
  reading: BookMarked,
  mcq: ListChecks,
  short: FileQuestion,
  long: FileText,
};

export default async function ChapterDetailPage({
  params,
}: {
  params: Promise<{ slug: string; chapterSlug: string }>;
}) {
  const { slug, chapterSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let activeBoard: Board | null = null;
  let activeGrade: GradeLevel | null = null;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('board, grade_level').eq('id', user.id).single();
    activeBoard = (profile?.board as Board | null) ?? null;
    activeGrade = (profile?.grade_level as GradeLevel | null) ?? null;
  }

  const { data: subject } = await supabase.from('subjects').select('*').eq('slug', slug).single();
  if (!subject) notFound();

  const { data: rawChapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subject.id)
    .eq('is_active', true)
    .order('order_index');

  const chapters = (rawChapters || []).filter((chapter) => {
    const boardVisible =
      !activeBoard ||
      !Array.isArray(chapter.boards) ||
      chapter.boards.length === 0 ||
      chapter.boards.includes(activeBoard);
    const subjectHasMultipleGrades = Array.isArray(subject.grade_levels) && subject.grade_levels.length > 1;
    const chapterHasGrades = Array.isArray(chapter.grade_levels) && chapter.grade_levels.length > 0;
    const gradeVisible =
      !activeGrade || (chapterHasGrades ? chapter.grade_levels.includes(activeGrade) : !subjectHasMultipleGrades);
    return boardVisible && gradeVisible;
  });

  const chapterIndex = chapters.findIndex((chapter) => chapter.slug === chapterSlug);
  if (chapterIndex === -1) notFound();
  const chapter = chapters[chapterIndex]!;
  const previousChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
  const nextChapter = chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;

  const profileScope = { board: activeBoard, grade_level: activeGrade };
  const [{ data: lectures }, studyResources, subjectResources] = await Promise.all([
    supabase
      .from('lectures')
      .select('id, title, youtube_url, thumbnail_url, kind, exercise_number, duration_seconds')
      .eq('chapter_id', chapter.id)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true }),
    loadStudyCatalogResources(createServiceClient(), {
      subjectId: subject.id,
      subjectName: subject.name,
      chapterId: chapter.id,
      profile: profileScope,
    }),
    loadStudySubjectResources(createServiceClient(), {
      subjectId: subject.id,
      subjectName: subject.name,
      profile: profileScope,
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/study/${subject.slug}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        {subject.name}
      </Link>

      <header>
        <p className="text-sm font-semibold text-violet-300">
          Chapter {chapterIndex + 1} of {chapters.length}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{chapter.name}</h1>
        <p className="text-muted-foreground mt-2 text-sm">What would you like to study?</p>
      </header>

      {subjectResources.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold">Subject resources</h2>
            <p className="text-muted-foreground text-sm">
              These full books and notes cover the subject rather than only this chapter.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {subjectResources.map((resource) => {
              const sectionSlug =
                LIBRARY_SECTIONS.find((section) => section.value === resource.content_section)?.slug || 'reading';
              const href = `/library/${subject.slug}/general/${sectionSlug}?type=${resource.resource_type}&book=${encodeURIComponent(resource.book_title)}&resource=${resource.id}`;
              return (
                <Link key={resource.id} href={href} className="group block">
                  <Card className="border-border/60 bg-card/80 h-full transition-colors hover:border-violet-500/40">
                    <CardContent className="flex items-center gap-3 p-4">
                      <BookMarked className="h-5 w-5 shrink-0 text-violet-300" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold">{resource.title}</h3>
                        <p className="text-muted-foreground text-xs">
                          {resource.resource_type === 'text_book' ? 'Text book' : 'Notes'}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-violet-300 transition-transform group-hover:translate-x-1" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        {LIBRARY_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.value];
          const files = studyResources.filter((resource) => resource.content_section === section.value);
          const available = files.length > 0;
          const card = (
            <Card
              className={`border-border/60 bg-card/80 h-full transition-colors ${
                available ? 'group-hover:border-violet-500/40' : 'opacity-55'
              }`}
            >
              <CardContent className="flex min-h-32 flex-col p-4">
                <Icon className="h-6 w-6 text-violet-300" />
                <h2 className="mt-3 font-semibold">{section.title}</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  {available ? `${files.length} ${files.length === 1 ? 'file' : 'files'}` : 'Not available'}
                </p>
                {available && (
                  <ArrowRight className="mt-auto h-4 w-4 self-end text-violet-300 transition-transform group-hover:translate-x-1" />
                )}
              </CardContent>
            </Card>
          );

          return available ? (
            <Link
              key={section.value}
              href={`/library/${subject.slug}/${chapter.slug}/${section.slug}?type=notes`}
              className="group block"
            >
              {card}
            </Link>
          ) : (
            <div key={section.value}>{card}</div>
          );
        })}
      </div>

      {(lectures?.length || 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Lectures</h2>
          <LectureGrid lectures={(lectures || []) as StudyLecture[]} />
        </section>
      )}

      <nav className="border-border/60 flex items-center justify-between gap-3 border-t pt-5">
        {previousChapter ? (
          <Link
            href={`/study/${subject.slug}/${previousChapter.slug}`}
            className="text-muted-foreground hover:text-foreground inline-flex min-w-0 items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">Previous</span>
          </Link>
        ) : (
          <span />
        )}
        {nextChapter ? (
          <Link
            href={`/study/${subject.slug}/${nextChapter.slug}`}
            className="text-muted-foreground hover:text-foreground inline-flex min-w-0 items-center gap-2 text-sm font-medium"
          >
            <span className="truncate">Next chapter</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">Last chapter</span>
        )}
      </nav>
    </div>
  );
}
