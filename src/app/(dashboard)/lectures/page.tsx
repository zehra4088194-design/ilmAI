import Link from 'next/link';
import { ArrowRight, BookOpen, GraduationCap, PlayCircle, Search, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Board, GradeLevel } from '@/types';

export const metadata = { title: 'Lectures' };

type SubjectRow = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  boards: string[] | null;
  grade_levels: string[] | null;
};

type ChapterRow = {
  id: string;
  name: string;
  slug: string;
  subject_id: string;
  order_index: number;
  boards: string[] | null;
  grade_levels: string[] | null;
};

function visibleForProfile(
  item: { boards?: string[] | null; grade_levels?: string[] | null },
  board: Board | null,
  grade: GradeLevel | null
) {
  const boardVisible = !board || !item.boards?.length || item.boards.includes(board);
  const gradeVisible = !grade || !item.grade_levels?.length || item.grade_levels.includes(grade);
  return boardVisible && gradeVisible;
}

export default async function LecturesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('board, grade_level').eq('id', user.id).single()
    : { data: null };
  const board = (profile?.board as Board | null) ?? null;
  const grade = (profile?.grade_level as GradeLevel | null) ?? null;
  const query = (await searchParams).search?.trim().toLowerCase() || '';

  const { data: subjectRows } = await supabase
    .from('subjects')
    .select('id, name, slug, color, boards, grade_levels')
    .eq('is_active', true)
    .order('name');
  const subjects = ((subjectRows || []) as SubjectRow[]).filter((subject) =>
    visibleForProfile(subject, board, grade)
  );
  const { data: chapterRows } = subjects.length
    ? await supabase
        .from('chapters')
        .select('id, name, slug, subject_id, order_index, boards, grade_levels')
        .in('subject_id', subjects.map((subject) => subject.id))
        .eq('is_active', true)
        .order('order_index')
    : { data: [] as ChapterRow[] };
  const chapters = ((chapterRows || []) as ChapterRow[]).filter((chapter) =>
    visibleForProfile(chapter, board, grade)
  );
  const { data: lectures } = chapters.length
    ? await supabase.from('lectures').select('id, title, chapter_id').in('chapter_id', chapters.map((chapter) => chapter.id))
    : { data: [] as Array<{ id: string; title: string; chapter_id: string }> };

  const lectureCountByChapter = new Map<string, number>();
  for (const lecture of lectures || []) {
    lectureCountByChapter.set(lecture.chapter_id, (lectureCountByChapter.get(lecture.chapter_id) || 0) + 1);
  }
  const subjectCards = subjects
    .map((subject) => {
      const subjectChapters = chapters.filter(
        (chapter) => chapter.subject_id === subject.id && (lectureCountByChapter.get(chapter.id) || 0) > 0
      );
      const lectureCount = subjectChapters.reduce(
        (total, chapter) => total + (lectureCountByChapter.get(chapter.id) || 0),
        0
      );
      return { subject, chapters: subjectChapters, lectureCount };
    })
    .filter(({ subject, chapters, lectureCount }) => {
      if (!lectureCount) return false;
      if (!query) return true;
      return [subject.name, ...chapters.map((chapter) => chapter.name)].some((value) =>
        value.toLowerCase().includes(query)
      );
    });
  const totalLectures = subjectCards.reduce((total, card) => total + card.lectureCount, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="border-border/60 via-background overflow-hidden rounded-3xl border bg-gradient-to-br from-violet-500/15 to-cyan-500/10 p-5 sm:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1"><Video className="h-3.5 w-3.5" /> Lectures</Badge>
              {board && <Badge variant="outline">{BOARDS.find((item) => item.value === board)?.label || board}</Badge>}
              {grade && <Badge variant="outline">{GRADE_LEVELS.find((item) => item.value === grade)?.label || grade}</Badge>}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Video Lectures</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">Pehle subject, phir chapter select karein. Final page par sirf us chapter ke lectures load honge.</p>
          </div>
          <form className="relative w-full md:w-72">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input name="search" defaultValue={query} placeholder="Search subjects..." className="border-border bg-background/70 w-full rounded-xl border py-2.5 pr-3 pl-9 text-sm outline-none" />
          </form>
        </div>
      </section>

      {subjectCards.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjectCards.map(({ subject, chapters: subjectChapters, lectureCount }) => (
            <Link key={subject.id} href={`/lectures/${subject.slug}`} className="group block">
              <Card className="border-border/70 bg-card/85 hover:border-primary/40 h-full overflow-hidden transition-all group-hover:-translate-y-1 group-hover:shadow-xl">
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${subject.color || '#7c3aed'}, transparent)` }} />
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl"><GraduationCap className="h-6 w-6" /></span>
                    <Badge variant="outline">{lectureCount} lectures</Badge>
                  </div>
                  <h2 className="mt-4 text-xl font-bold">{subject.name}</h2>
                  <p className="text-muted-foreground mt-1 text-sm">{subjectChapters.length} chapters with video lessons</p>
                  <div className="text-muted-foreground mt-4 flex-1 space-y-1.5 text-xs">
                    {subjectChapters.slice(0, 3).map((chapter) => (
                      <p key={chapter.id} className="truncate">- {chapter.name}</p>
                    ))}
                  </div>
                  <div className="border-border/70 mt-5 flex items-center justify-between border-t pt-4 text-sm font-semibold">
                    <span>Open chapters</span><ArrowRight className="text-primary h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed"><CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center"><PlayCircle className="text-primary mb-4 h-10 w-10" /><h2 className="text-lg font-semibold">No lectures found</h2><p className="text-muted-foreground mt-2 text-sm">Chapter-tagged lectures added by an admin will appear here in an organized format.</p><Link href="/study" className="text-primary mt-5 inline-flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4" />Open subjects</Link></CardContent></Card>
      )}

      <p className="text-muted-foreground text-center text-xs">{totalLectures} visible lectures across {subjectCards.length} subjects</p>
    </div>
  );
}
