import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, FileQuestion, FileText, ListChecks } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import {
  countStudyResourceSections,
  loadStudyCatalogResources,
  type StudyCatalogResource,
} from '@/lib/resources/study-catalog';
import type { Board, GradeLevel } from '@/types';

export default async function SubjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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

  const subjectVisible =
    (!activeBoard ||
      !Array.isArray(subject.boards) ||
      subject.boards.length === 0 ||
      subject.boards.includes(activeBoard)) &&
    (!activeGrade ||
      !Array.isArray(subject.grade_levels) ||
      subject.grade_levels.length === 0 ||
      subject.grade_levels.includes(activeGrade));
  if (!subjectVisible) notFound();

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

  const studyResources = await loadStudyCatalogResources(supabase, {
    subjectId: subject.id,
    subjectName: subject.name,
    profile: { board: activeBoard, grade_level: activeGrade },
  });
  const resourcesByChapter = new Map<string, StudyCatalogResource[]>();
  for (const resource of studyResources) {
    if (!resource.chapter_id) continue;
    const items = resourcesByChapter.get(resource.chapter_id) || [];
    items.push(resource);
    resourcesByChapter.set(resource.chapter_id, items);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/study"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        All subjects
      </Link>

      <header>
        <p className="text-sm font-semibold text-violet-300">{subject.code}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{subject.name}</h1>
        <p className="text-muted-foreground mt-2 text-sm">Choose a chapter to start studying.</p>
      </header>

      <div className="space-y-3">
        {chapters.map((chapter, index) => {
          const resources = resourcesByChapter.get(chapter.id) || [];
          const counts = countStudyResourceSections(resources);
          return (
            <Link key={chapter.id} href={`/study/${subject.slug}/${chapter.slug}`} className="group block">
              <Card className="border-border/60 bg-card/80 transition-colors hover:border-violet-500/40">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-sm font-bold text-violet-300">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="leading-snug font-semibold">{chapter.name}</h2>
                    <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {counts.reading > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" /> Reading
                        </span>
                      )}
                      {counts.mcq > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <ListChecks className="h-3.5 w-3.5" /> MCQs
                        </span>
                      )}
                      {counts.short > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <FileQuestion className="h-3.5 w-3.5" /> Short
                        </span>
                      )}
                      {counts.long > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" /> Long
                        </span>
                      )}
                      {resources.length === 0 && <span>Resources coming soon</span>}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-violet-300 transition-transform group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {chapters.length === 0 && (
        <div className="border-border/70 text-muted-foreground rounded-3xl border border-dashed px-6 py-14 text-center">
          No chapters are available for this subject yet.
        </div>
      )}
    </div>
  );
}
