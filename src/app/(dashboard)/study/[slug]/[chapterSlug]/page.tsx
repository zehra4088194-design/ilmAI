import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookMarked, FileQuestion, FileText, ListChecks } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { LectureGrid, type StudyLecture } from '@/components/features/study/LectureGrid';
import { LIBRARY_SECTIONS } from '@/lib/resources/catalog';
import { loadStudyCatalogResources } from '@/lib/resources/study-catalog';
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

  const [{ data: lectures }, studyResources] = await Promise.all([
    supabase
      .from('lectures')
      .select('id, title, youtube_url, thumbnail_url, kind, exercise_number, duration_seconds')
      .eq('chapter_id', chapter.id)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true }),
    loadStudyCatalogResources(supabase, {
      subjectId: subject.id,
      subjectName: subject.name,
      chapterId: chapter.id,
      profile: { board: activeBoard, grade_level: activeGrade },
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
