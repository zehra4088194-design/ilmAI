import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AiPracticeHub } from '@/components/features/quiz/AiPracticeHub';

export const metadata: Metadata = { title: 'AI Testing' };

export default async function PracticePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let grade = 'GRADE_10';
  let board = 'FBISE';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('board, grade_level')
      .eq('id', user.id)
      .single();
    grade = profile?.grade_level || 'GRADE_10';
    board = profile?.board || 'FBISE';
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
    const boardVisible = boards.length === 0 || boards.includes(board);
    const gradeVisible = levels.length === 0 || levels.includes(grade);
    const visible = boardVisible && gradeVisible;
    if (!visible) return;
    if (!chaptersBySubject[c.subject_id]) chaptersBySubject[c.subject_id] = [];
    chaptersBySubject[c.subject_id]!.push({ id: c.id, name: c.name });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Testing</h1>
        <p className="text-muted-foreground">Tumhari selected board/class ke chapters par AI MCQs, short aur long tests banayega.</p>
      </div>
      <AiPracticeHub subjects={subjects || []} chaptersBySubject={chaptersBySubject} />
    </div>
  );
}
