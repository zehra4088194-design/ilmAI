import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookMarked, BookOpen, Layers3, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export const metadata: Metadata = { title: 'Study' };

function getBoardMeta(board?: string | null) {
  return BOARDS.find((item) => item.value === board);
}

function getGradeMeta(grade?: string | null) {
  return GRADE_LEVELS.find((item) => item.value === grade);
}

export default async function StudyPage() {
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

  let subjectsQuery = supabase.from('subjects').select('*').eq('is_active', true).order('name');
  if (activeBoard) subjectsQuery = subjectsQuery.contains('boards', [activeBoard]);
  if (activeGrade) subjectsQuery = subjectsQuery.contains('grade_levels', [activeGrade]);

  let { data: subjects } = await subjectsQuery;

  if ((!subjects || subjects.length === 0) && (activeBoard || activeGrade)) {
    const fallback = await supabase.from('subjects').select('*').eq('is_active', true).order('name');
    subjects = fallback.data ?? [];
  }

  const subjectIds = (subjects || []).map((subject) => subject.id);
  const { data: chapters } = subjectIds.length
    ? await supabase
        .from('chapters')
        .select('*')
        .in('subject_id', subjectIds)
        .eq('is_active', true)
        .order('order_index')
    : { data: [] as any[] };

  const chaptersBySubject = new Map<string, any[]>();
  for (const chapter of chapters || []) {
    if (
      activeBoard &&
      Array.isArray(chapter.boards) &&
      chapter.boards.length > 0 &&
      !chapter.boards.includes(activeBoard)
    ) {
      continue;
    }

    const current = chaptersBySubject.get(chapter.subject_id) || [];
    current.push(chapter);
    chaptersBySubject.set(chapter.subject_id, current);
  }

  const boardMeta = getBoardMeta(activeBoard);
  const gradeMeta = getGradeMeta(activeGrade);
  const totalVisibleChapters = Array.from(chaptersBySubject.values()).reduce(
    (count, list) => count + list.length,
    0
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-violet-500/15 via-background to-cyan-500/10 shadow-[0_24px_80px_-32px_rgba(109,40,217,0.45)]">
        <div className="grid gap-6 px-6 py-7 md:grid-cols-[1.35fr_0.85fr] md:px-8 md:py-8">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-violet-500/30 bg-violet-500/15 px-3 py-1 text-violet-300">
                Boards -&gt; Subjects -&gt; Chapters
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

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Study material ab sirf flat list nahi, proper structure ke sath.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Yahan tumhare board aur class ke mutabiq subjects milenge, har subject ke andar
                chapter preview bhi nazar aayega taa-ke books aur chapters dono ek nazar me clear
                hon.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Subjects</p>
                <p className="mt-2 text-2xl font-bold">{subjects?.length || 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Chapters</p>
                <p className="mt-2 text-2xl font-bold">{totalVisibleChapters}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Focus</p>
                <p className="mt-2 text-sm font-semibold text-foreground/90">
                  {boardMeta?.province || 'All boards'} {gradeMeta ? '| ' : ''}
                  {gradeMeta?.level || 'Board-aligned'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-black/10 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
              <Sparkles className="h-4 w-4" />
              Study flow
            </div>
            <div className="mt-4 space-y-3">
              {[
                {
                  icon: <Layers3 className="h-4 w-4 text-cyan-300" />,
                  title: boardMeta?.label || 'Apna board set karo',
                  text: 'Board ko top level par highlight kiya gaya hai taa-ke irrelevant cheezen kam dikhen.',
                },
                {
                  icon: <BookOpen className="h-4 w-4 text-emerald-300" />,
                  title: `${subjects?.length || 0} subject${subjects?.length === 1 ? '' : 's'} ready`,
                  text: 'Har card me chapter preview aur direct subject open action milega.',
                },
                {
                  icon: <BookMarked className="h-4 w-4 text-amber-300" />,
                  title: `${totalVisibleChapters} visible chapters`,
                  text: 'Chapter level screen par next step aur quick study actions bhi milenge.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-background/40 p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    {item.icon}
                    {item.title}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Subjects aur unke chapter previews</h2>
            <p className="text-sm text-muted-foreground">
              Har subject ke andar ka structure yahin se skim kar lo, phir detail me khol lo.
            </p>
          </div>
          {(!activeBoard || !activeGrade) && (
            <p className="text-right text-xs text-muted-foreground">
              Board ya class set nahi hai, is liye abhi wider catalog dikh raha hai.
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(subjects || []).map((subject) => {
            const visibleChapters = chaptersBySubject.get(subject.id) || [];
            const completionHint = visibleChapters.length
              ? Math.min(
                  100,
                  Math.round((visibleChapters.length / Math.max(subject.total_chapters || 1, 1)) * 100)
                )
              : 0;

            return (
              <Link key={subject.id} href={`/study/${subject.slug}`} className="group h-full">
                <Card className="h-full overflow-hidden border-border/60 bg-card/80 transition-all duration-200 hover:-translate-y-1 hover:border-violet-500/35 hover:shadow-[0_18px_50px_-28px_rgba(109,40,217,0.65)]">
                  <div
                    className="h-1.5 w-full"
                    style={{
                      background: `linear-gradient(90deg, ${subject.color}, ${subject.color}80)`,
                    }}
                  />
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10"
                        style={{ backgroundColor: `${subject.color}20` }}
                      >
                        <BookOpen className="h-5 w-5" style={{ color: subject.color }} />
                      </div>
                      <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                        {visibleChapters.length} chapters
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <h3 className="text-lg font-semibold leading-tight">{subject.name}</h3>
                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {subject.description ||
                          `Board-focused material with chapter navigation for ${subject.name.toLowerCase()}.`}
                      </p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <span>Chapter coverage</span>
                        <span>{completionHint}%</span>
                      </div>
                      <Progress value={completionHint} className="h-2" />
                      <div className="mt-3 space-y-2">
                        {visibleChapters.slice(0, 4).map((chapter, index) => (
                          <div key={chapter.id} className="flex items-start gap-3 text-sm">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-[11px] font-bold text-violet-300">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{chapter.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {chapter.total_topics || 0} topics | {chapter.total_questions || 0} questions
                              </p>
                            </div>
                          </div>
                        ))}
                        {visibleChapters.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Is subject ki chapter list jald hi yahan show hogi.
                          </p>
                        )}
                        {visibleChapters.length > 4 && (
                          <p className="text-xs font-medium text-violet-300">
                            +{visibleChapters.length - 4} aur chapters andar available hain
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between pt-1 text-sm font-semibold text-violet-300">
                      <span>Open subject</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {(!subjects || subjects.length === 0) && (
            <div className="col-span-full rounded-3xl border border-dashed border-border/70 bg-card/60 px-6 py-16 text-center text-muted-foreground">
              Is board/class ke liye abhi subjects available nahi hain. Thori dair baad dobara check karo.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
