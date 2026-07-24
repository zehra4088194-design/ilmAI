import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AiPracticeHub } from '@/components/features/quiz/AiPracticeHub';
import type { Board, GradeLevel } from '@/types';

export const metadata: Metadata = { title: 'AI Testing' };

export default async function PracticePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let grade: GradeLevel = 'GRADE_10';
  let board: Board = 'FBISE';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('board, grade_level')
      .eq('id', user.id)
      .single();
    grade = (profile?.grade_level as GradeLevel | null) || 'GRADE_10';
    board = (profile?.board as Board | null) || 'FBISE';
  }

  const subjectsQuery = supabase
    .from('subjects')
    .select('*')
    .eq('is_active', true)
    .contains('boards', [board])
    .contains('grade_levels', [grade])
    .order('name');

  const { data: subjects } = await subjectsQuery;
  const visibleSubjectIds = new Set((subjects || []).map((subject) => subject.id));
  const subjectGradeCounts = new Map((subjects || []).map((subject) => [subject.id, (subject.grade_levels || []).length]));

  const { data: allChapters } = await supabase
    .from('chapters')
    .select('id, subject_id, name, order_index, boards, grade_levels')
    .eq('is_active', true)
    .order('order_index', { ascending: true });

  const chaptersBySubject: Record<string, { id: string; name: string }[]> = {};
  (allChapters || []).forEach((c) => {
    if (!visibleSubjectIds.has(c.subject_id)) return;
    const boards = c.boards || [];
    const levels = c.grade_levels || [];
    const subjectGradeCount = subjectGradeCounts.get(c.subject_id) || 0;
    const boardVisible = boards.length === 0 || boards.includes(board);
    const gradeVisible = levels.length > 0 ? levels.includes(grade) : subjectGradeCount <= 1;
    const visible = boardVisible && gradeVisible;
    if (!visible) return;
    if (!chaptersBySubject[c.subject_id]) chaptersBySubject[c.subject_id] = [];
    chaptersBySubject[c.subject_id]!.push({ id: c.id, name: c.name });
  });

  const { data: sourceFiles } = await supabase
    .from('library_resources')
    .select('id, title, chapter_id, subject_id, board, grade_level')
    .eq('resource_type', 'notes')
    .in('subject_id', Array.from(visibleSubjectIds))
    .not('chapter_id', 'is', null)
    .order('title');

  const resourcesByChapter: Record<string, { id: string; title: string }[]> = {};
  (sourceFiles || []).forEach((resource) => {
    if (!resource.chapter_id || !resource.subject_id || !visibleSubjectIds.has(resource.subject_id)) return;
    if (resource.board && resource.board !== board) return;
    if (resource.grade_level && resource.grade_level !== grade) return;
    if (!resourcesByChapter[resource.chapter_id]) resourcesByChapter[resource.chapter_id] = [];
    resourcesByChapter[resource.chapter_id]!.push({ id: resource.id, title: resource.title });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chapter Testing</h1>
        <p className="text-muted-foreground">Choose a chapter and question type. Every attempt is rebuilt in a fresh random order from all of its uploaded source text.</p>
      </div>
      <AiPracticeHub subjects={subjects || []} chaptersBySubject={chaptersBySubject} resourcesByChapter={resourcesByChapter} />
    </div>
  );
}
