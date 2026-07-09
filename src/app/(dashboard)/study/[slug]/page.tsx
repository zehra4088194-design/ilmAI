import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Layers3, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';

function getBoardMeta(board?: string | null) {
  return BOARDS.find((item) => item.value === board);
}

function getGradeMeta(grade?: string | null) {
  return GRADE_LEVELS.find((item) => item.value === grade);
}

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let activeBoard: string | null = null;
  let activeGrade: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('board, grade_level')
      .eq('id', user.id)
      .single();

    activeBoard = profile?.board ?? null;
    activeGrade = profile?.grade_level ?? null;
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

  const chapters = (rawChapters || []).filter((chapter) => {
    const boardVisible = !activeBoard || !Array.isArray(chapter.boards) || chapter.boards.length === 0 || chapter.boards.includes(activeBoard);
    const subjectHasMultipleGrades = Array.isArray(subject.grade_levels) && subject.grade_levels.length > 1;
    const chapterHasGrades = Array.isArray(chapter.grade_levels) && chapter.grade_levels.length > 0;
    const gradeVisible = !activeGrade || (chapterHasGrades ? chapter.grade_levels.includes(activeGrade) : !subjectHasMultipleGrades);
    return boardVisible && gradeVisible;
  });

  const boardMeta = getBoardMeta(activeBoard);
  const gradeMeta = getGradeMeta(activeGrade);
  const firstChapter = chapters[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/study"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to study overview
      </Link>

      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-background via-violet-500/10 to-cyan-500/10">
        <div className="grid gap-6 px-6 py-7 md:grid-cols-[1.3fr_0.9fr] md:px-8">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-violet-300">
                {subject.code}
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
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{subject.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                {subject.description ||
                  `${subject.name} ke chapters ab cleaner hierarchy me available hain taa-ke board se chapter tak navigation zyada natural lage.`}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Visible chapters</p>
                <p className="mt-2 text-2xl font-bold">{chapters.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Question bank</p>
                <p className="mt-2 text-2xl font-bold">{subject.total_questions || 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Boards</p>
                <p className="mt-2 text-sm font-semibold text-foreground/90">{subject.boards?.length || 0} linked boards</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-black/10 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
              <Sparkles className="h-4 w-4" />
              Quick orientation
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Layers3 className="h-4 w-4 text-cyan-300" />
                  Structured chapter path
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Har chapter ko alag screen milti hai jahan se next actions aur navigation clear rehta hai.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <BookOpen className="h-4 w-4 text-emerald-300" />
                  Best place to start
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {firstChapter
                    ? `Start with "${firstChapter.name}" aur phir sequence me aage barho.`
                    : 'Chapter list abhi populate honi baqi hai.'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-amber-300" />
                  Cleaner board fit
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Board-specific chapters automatically filter ho jate hain taa-ke extra noise kam ho.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Chapter list</h2>
            <p className="text-sm text-muted-foreground">
              Ab har chapter ko alag route aur clearer preview mil raha hai.
            </p>
          </div>
          {firstChapter && (
            <Link
              href={`/study/${subject.slug}/${firstChapter.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-500/15"
            >
              Start first chapter
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="space-y-3">
          {chapters.map((chapter, index) => {
            const boardScoped = Array.isArray(chapter.boards) && chapter.boards.length > 0;
            const gradeScoped = Array.isArray(chapter.grade_levels) && chapter.grade_levels.length > 0;

            return (
              <Link key={chapter.id} href={`/study/${subject.slug}/${chapter.slug}`} className="group block">
                <Card className="overflow-hidden border-border/60 bg-card/80 transition-all duration-200 hover:border-violet-500/35 hover:shadow-[0_16px_48px_-28px_rgba(109,40,217,0.55)]">
                  <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-sm font-bold text-violet-300">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold">{chapter.name}</h3>
                          <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {boardScoped ? 'Board scoped' : 'All boards'} · {gradeScoped ? 'Class scoped' : 'All classes'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {chapter.description ||
                            `${chapter.total_topics || 0} topics aur ${chapter.total_questions || 0} questions ke sath chapter detail open karo.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 md:shrink-0">
                      <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Coverage</p>
                        <p className="mt-1 text-sm font-semibold">
                          {chapter.total_topics || 0} topics | {chapter.total_questions || 0} questions
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-violet-300 transition-transform duration-200 group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}

          {chapters.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border/70 bg-card/60 px-6 py-16 text-center text-muted-foreground">
              Is subject ke liye abhi visible chapters nahi mile.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
