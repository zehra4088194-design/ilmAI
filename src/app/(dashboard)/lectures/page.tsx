import Link from 'next/link';
import { BookOpen, GraduationCap, PlayCircle, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LectureGrid, type StudyLecture } from '@/components/features/study/LectureGrid';
import type { Board, GradeLevel } from '@/types';

export const metadata = { title: 'Lectures' };

type SubjectRow = {
  id: string;
  name: string;
  slug: string;
  boards: string[] | null;
  grade_levels: string[] | null;
};

type ChapterRow = {
  id: string;
  name: string;
  slug: string;
  subject_id: string;
  boards: string[] | null;
  grade_levels: string[] | null;
};

function boardLabel(board?: string | null) {
  return BOARDS.find((item) => item.value === board)?.label;
}

function gradeLabel(grade?: string | null) {
  return GRADE_LEVELS.find((item) => item.value === grade)?.label;
}

function visibleForProfile(
  item: { boards?: string[] | null; grade_levels?: string[] | null },
  board: Board | null,
  grade: GradeLevel | null
) {
  const boardVisible = !board || !Array.isArray(item.boards) || item.boards.length === 0 || item.boards.includes(board);
  const gradeVisible =
    !grade || !Array.isArray(item.grade_levels) || item.grade_levels.length === 0 || item.grade_levels.includes(grade);
  return boardVisible && gradeVisible;
}

export default async function LecturesPage({ searchParams }: { searchParams?: Promise<{ search?: string }> }) {
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

  const subjectsQuery = supabase
    .from('subjects')
    .select('id, name, slug, boards, grade_levels')
    .eq('is_active', true)
    .order('name');

  const { data: subjects } = await subjectsQuery;
  const visibleSubjects = ((subjects || []) as SubjectRow[]).filter((subject) =>
    visibleForProfile(subject, activeBoard, activeGrade)
  );
  const subjectIds = visibleSubjects.map((subject) => subject.id);

  const { data: chapters } = subjectIds.length
    ? await supabase
        .from('chapters')
        .select('id, name, slug, subject_id, boards, grade_levels')
        .in('subject_id', subjectIds)
        .eq('is_active', true)
        .order('order_index')
    : { data: [] as ChapterRow[] };

  const subjectById = new Map(visibleSubjects.map((subject) => [subject.id, subject]));
  const visibleChapters = ((chapters || []) as ChapterRow[]).filter((chapter) =>
    visibleForProfile(chapter, activeBoard, activeGrade)
  );
  const chapterById = new Map(visibleChapters.map((chapter) => [chapter.id, chapter]));
  const chapterIds = visibleChapters.map((chapter) => chapter.id);

  const { data: lectures } = chapterIds.length
    ? await supabase
        .from('lectures')
        .select(
          'id, title, youtube_url, thumbnail_url, kind, exercise_number, duration_seconds, chapter_id, order_index, created_at'
        )
        .in('chapter_id', chapterIds)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true })
    : {
        data: [] as Array<
          StudyLecture & { chapter_id: string; order_index?: number | null; created_at?: string | null }
        >,
      };

  const lectureRows = (lectures || []) as Array<StudyLecture & { chapter_id: string }>;
  const searchQuery = (await searchParams)?.search?.trim().toLowerCase() || '';
  const lecturesBySubject = new Map<
    string,
    Array<StudyLecture & { chapterName: string; chapterSlug: string; subjectSlug: string }>
  >();

  for (const lecture of lectureRows) {
    const chapter = chapterById.get(lecture.chapter_id);
    if (!chapter) continue;
    const subject = subjectById.get(chapter.subject_id);
    if (!subject) continue;
    if (
      searchQuery &&
      ![lecture.title, chapter.name, subject.name].some((value) => value.toLowerCase().includes(searchQuery))
    ) {
      continue;
    }
    const list = lecturesBySubject.get(subject.id) || [];
    list.push({
      id: lecture.id,
      title: lecture.title,
      youtube_url: lecture.youtube_url,
      thumbnail_url: lecture.thumbnail_url,
      kind: lecture.kind,
      exercise_number: lecture.exercise_number,
      duration_seconds: lecture.duration_seconds,
      chapterName: chapter.name,
      chapterSlug: chapter.slug,
      subjectSlug: subject.slug,
    });
    lecturesBySubject.set(subject.id, list);
  }

  const totalLectures = Array.from(lecturesBySubject.values()).reduce((count, list) => count + list.length, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="border-border/60 via-background overflow-hidden rounded-[2rem] border bg-gradient-to-br from-violet-500/15 to-cyan-500/10 p-6 shadow-[0_24px_80px_-32px_rgba(109,40,217,0.45)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <Video className="h-3.5 w-3.5" />
                Lectures
              </Badge>
              {activeBoard && <Badge variant="outline">{boardLabel(activeBoard) || activeBoard}</Badge>}
              {activeGrade && <Badge variant="outline">{gradeLabel(activeGrade) || activeGrade}</Badge>}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Video lectures</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6 md:text-base">
                Tumhari selected class aur board ke lectures ek jagah. Video site ke andar hi open hogi.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-72">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">Lectures</p>
              <p className="mt-2 text-2xl font-bold">{totalLectures}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">Subjects</p>
              <p className="mt-2 text-2xl font-bold">{lecturesBySubject.size}</p>
            </div>
          </div>
        </div>
      </section>

      {totalLectures === 0 ? (
        <Card className="bg-card/80 border-dashed">
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
            <div className="bg-primary/15 text-primary mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
              <PlayCircle className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-semibold">Abhi lectures add nahi hue</h2>
            <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
              Admin panel se lectures add honge to yahan tumhari class ke hisaab se automatically show honge.
            </p>
            <Link href="/study" className="text-primary mt-5 inline-flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="h-4 w-4" />
              Study subjects open karo
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {visibleSubjects.map((subject) => {
            const subjectLectures = lecturesBySubject.get(subject.id) || [];
            if (!subjectLectures.length) return null;
            return (
              <section key={subject.id} className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="text-primary flex items-center gap-2 text-sm font-semibold">
                      <GraduationCap className="h-4 w-4" />
                      {subject.name}
                    </div>
                    <h2 className="mt-1 text-2xl font-bold">
                      {subjectLectures.length} lecture{subjectLectures.length === 1 ? '' : 's'}
                    </h2>
                  </div>
                  <Link
                    href={`/study/${subject.slug}`}
                    className="text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors"
                  >
                    Subject open karo
                  </Link>
                </div>
                <LectureGrid
                  lectures={subjectLectures.map((lecture) => ({
                    id: lecture.id,
                    title: `${lecture.chapterName} - ${lecture.title}`,
                    youtube_url: lecture.youtube_url,
                    thumbnail_url: lecture.thumbnail_url,
                    kind: lecture.kind,
                    exercise_number: lecture.exercise_number,
                    duration_seconds: lecture.duration_seconds,
                  }))}
                />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
