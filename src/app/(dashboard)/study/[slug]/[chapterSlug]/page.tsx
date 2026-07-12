import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Brain, FileText, NotebookPen, Sparkles, Target } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { LectureGrid, type StudyLecture } from '@/components/features/study/LectureGrid';
import type { Board, GradeLevel } from '@/types';

function getBoardMeta(board?: string | null) {
  return BOARDS.find((item) => item.value === board);
}

function getGradeMeta(grade?: string | null) {
  return GRADE_LEVELS.find((item) => item.value === grade);
}

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('board, grade_level')
      .eq('id', user.id)
      .single();

    activeBoard = (profile?.board as Board | null) ?? null;
    activeGrade = (profile?.grade_level as GradeLevel | null) ?? null;
  }

  const { data: subject } = await supabase.from('subjects').select('*').eq('slug', slug).single();
  if (!subject) notFound();
  const subjectBoardVisible = !activeBoard || !Array.isArray(subject.boards) || subject.boards.length === 0 || subject.boards.includes(activeBoard);
  const subjectGradeVisible = !activeGrade || !Array.isArray(subject.grade_levels) || subject.grade_levels.length === 0 || subject.grade_levels.includes(activeGrade);
  if (!subjectBoardVisible || !subjectGradeVisible) notFound();

  const { data: rawChapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subject.id)
    .eq('is_active', true)
    .order('order_index');

  const chapters = (rawChapters || []).filter((item) => {
    const boardVisible = !activeBoard || !Array.isArray(item.boards) || item.boards.length === 0 || item.boards.includes(activeBoard);
    const subjectHasMultipleGrades = Array.isArray(subject.grade_levels) && subject.grade_levels.length > 1;
    const chapterHasGrades = Array.isArray(item.grade_levels) && item.grade_levels.length > 0;
    const gradeVisible = !activeGrade || (chapterHasGrades ? item.grade_levels.includes(activeGrade) : !subjectHasMultipleGrades);
    return boardVisible && gradeVisible;
  });

  const chapterIndex = chapters.findIndex((item) => item.slug === chapterSlug);
  if (chapterIndex === -1) notFound();

  const chapter = chapters[chapterIndex]!;
  const previousChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
  const nextChapter = chapterIndex < chapters.length - 1 ? chapters[chapterIndex + 1] : null;
  const boardMeta = getBoardMeta(activeBoard);
  const gradeMeta = getGradeMeta(activeGrade);
  const { data: lectures } = await supabase
    .from('lectures')
    .select('id, title, youtube_url, thumbnail_url, kind, exercise_number, duration_seconds')
    .eq('chapter_id', chapter.id)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: true });

  const quickActions = [
    {
      href: '/ai-tutor',
      title: 'AI Tutor se samjho',
      description: 'Isi chapter ke concepts ko step-by-step samajhne ke liye tutor kholo.',
      icon: <Brain className="h-5 w-5 text-violet-300" />,
    },
    {
      href: '/practice',
      title: 'MCQ practice karo',
      description: 'Concept read karne ke baad objective practice se understanding pakki karo.',
      icon: <Target className="h-5 w-5 text-cyan-300" />,
    },
    {
      href: '/notes',
      title: 'Notes banao',
      description: 'Important formulas, definitions aur pitfalls apni notes me save karo.',
      icon: <NotebookPen className="h-5 w-5 text-emerald-300" />,
    },
    {
      href: '/full-test',
      title: 'Full test readiness',
      description: 'Jab chapter cover ho jaye to subjective + MCQ mix test se khud ko check karo.',
      icon: <FileText className="h-5 w-5 text-amber-300" />,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/study" className="transition-colors hover:text-foreground">
          Study
        </Link>
        <span>/</span>
        <Link href={`/study/${subject.slug}`} className="transition-colors hover:text-foreground">
          {subject.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{chapter.name}</span>
      </div>

      <Link
        href={`/study/${subject.slug}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {subject.name}
      </Link>

      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-background via-violet-500/10 to-cyan-500/10">
        <div className="grid gap-6 px-6 py-7 md:grid-cols-[1.3fr_0.9fr] md:px-8">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-violet-300">
                Chapter {chapterIndex + 1} of {chapters.length}
              </span>
              {boardMeta && (
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-cyan-300">
                  {boardMeta.label}
                </span>
              )}
              {gradeMeta && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                  {gradeMeta.label}
                </span>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {subject.name}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{chapter.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                {chapter.description ||
                  'Is chapter ke liye ab dedicated stop ban gaya hai jahan se tum next study action quickly choose kar sako.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Topics</p>
                <p className="mt-2 text-2xl font-bold">{chapter.total_topics || 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Questions</p>
                <p className="mt-2 text-2xl font-bold">{chapter.total_questions || 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Position</p>
                <p className="mt-2 text-sm font-semibold text-foreground/90">
                  {chapterIndex + 1} / {chapters.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-black/10 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
              <Sparkles className="h-4 w-4" />
              Recommended flow
            </div>
            <div className="mt-4 space-y-3">
              {[
                'Pehle concept samjho aur chapter ki vocabulary clear karo.',
                'Uske baad MCQs ya short practice se weak spots pakro.',
                'End me notes ya test ke through retention solid karo.',
              ].map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl border border-white/10 bg-background/40 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-sm font-bold text-violet-300">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {(lectures?.length ?? 0) > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Lectures</h2>
            <p className="text-sm text-muted-foreground">
              Is chapter ki videos yahin site ke andar watch karo.
            </p>
          </div>
          <LectureGrid lectures={(lectures || []) as StudyLecture[]} />
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Quick study actions</h2>
          <p className="text-sm text-muted-foreground">
            Chapter open karte hi agla logical step seedha saamne hona chahiye.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href} className="group block h-full">
              <Card className="h-full border-border/60 bg-card/80 transition-all duration-200 hover:-translate-y-1 hover:border-violet-500/35 hover:shadow-[0_16px_48px_-28px_rgba(109,40,217,0.55)]">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/10">
                    {action.icon}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{action.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                    {action.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-sm font-semibold text-violet-300">
                    <span>Open</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Previous</p>
            {previousChapter ? (
              <Link
                href={`/study/${subject.slug}/${previousChapter.slug}`}
                className="mt-3 flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-4 transition-colors hover:border-violet-500/30"
              >
                <div>
                  <p className="font-semibold">{previousChapter.name}</p>
                  <p className="text-sm text-muted-foreground">Chapter {chapterIndex}</p>
                </div>
                <ArrowLeft className="h-4 w-4 text-violet-300" />
              </Link>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Yeh pehla visible chapter hai.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Next</p>
            {nextChapter ? (
              <Link
                href={`/study/${subject.slug}/${nextChapter.slug}`}
                className="mt-3 flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-4 transition-colors hover:border-violet-500/30"
              >
                <div>
                  <p className="font-semibold">{nextChapter.name}</p>
                  <p className="text-sm text-muted-foreground">Chapter {chapterIndex + 2}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-violet-300" />
              </Link>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Yeh aakhri visible chapter hai.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
