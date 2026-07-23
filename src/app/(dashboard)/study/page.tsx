import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Study' };

export default async function StudyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let activeBoard: string | null = null;
  let activeGrade: string | null = null;

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('board, grade_level').eq('id', user.id).single();
    activeBoard = profile?.board ?? null;
    activeGrade = profile?.grade_level ?? null;
  }

  let subjectsQuery = supabase.from('subjects').select('*').eq('is_active', true).order('name');
  if (activeBoard) subjectsQuery = subjectsQuery.contains('boards', [activeBoard]);
  if (activeGrade) subjectsQuery = subjectsQuery.contains('grade_levels', [activeGrade]);
  const { data: subjects } = await subjectsQuery;

  const subjectIds = (subjects || []).map((subject) => subject.id);
  const { data: chapters } = subjectIds.length
    ? await supabase
        .from('chapters')
        .select('id, subject_id, boards, grade_levels')
        .in('subject_id', subjectIds)
        .eq('is_active', true)
    : { data: [] as Array<{ id: string; subject_id: string; boards: string[]; grade_levels: string[] }> };

  const subjectGradeCounts = new Map(
    (subjects || []).map((subject) => [subject.id, (subject.grade_levels || []).length])
  );
  const chapterCountBySubject = new Map<string, number>();

  for (const chapter of chapters || []) {
    const boardVisible =
      !activeBoard ||
      !Array.isArray(chapter.boards) ||
      chapter.boards.length === 0 ||
      chapter.boards.includes(activeBoard);
    const chapterHasGrades = Array.isArray(chapter.grade_levels) && chapter.grade_levels.length > 0;
    const gradeVisible =
      !activeGrade ||
      (chapterHasGrades
        ? chapter.grade_levels.includes(activeGrade)
        : (subjectGradeCounts.get(chapter.subject_id) || 0) <= 1);

    if (boardVisible && gradeVisible) {
      chapterCountBySubject.set(chapter.subject_id, (chapterCountBySubject.get(chapter.subject_id) || 0) + 1);
    }
  }

  const boardLabel = BOARDS.find((item) => item.value === activeBoard)?.label;
  const gradeLabel = GRADE_LEVELS.find((item) => item.value === activeGrade)?.label;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {boardLabel && (
            <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-cyan-300">
              {boardLabel}
            </span>
          )}
          {gradeLabel && (
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-emerald-300">
              {gradeLabel}
            </span>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Choose a subject</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Select a subject, then choose a chapter and the type of material you need.
          </p>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(subjects || []).map((subject) => (
          <Link key={subject.id} href={`/study/${subject.slug}`} className="group block">
            <Card className="border-border/60 bg-card/80 h-full transition-colors hover:border-violet-500/40">
              <CardContent className="flex items-center gap-4 p-4">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${subject.color}20`, color: subject.color }}
                >
                  <BookOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{subject.name}</h2>
                  <p className="text-muted-foreground text-sm">{chapterCountBySubject.get(subject.id) || 0} chapters</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-violet-300 transition-transform group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {(!subjects || subjects.length === 0) && (
        <div className="border-border/70 text-muted-foreground rounded-3xl border border-dashed px-6 py-14 text-center">
          No subjects are available for your selected board and class yet.
        </div>
      )}
    </div>
  );
}
