import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('board, grade_level, education_level').eq('id', user.id).single();
  const db = createServiceClient() as any;
  let subjectQuery = db.from('subjects').select('id, name').eq('is_active', true).limit(12);
  if (profile?.board) subjectQuery = subjectQuery.contains('boards', [profile.board]);
  if (profile?.grade_level) subjectQuery = subjectQuery.contains('grade_levels', [profile.grade_level]);
  const { data: subjects } = await subjectQuery;
  const subjectIds = (subjects || []).map((subject: { id: string }) => subject.id);
  if (!subjectIds.length) return NextResponse.json({ status: 'error', error: 'Aap ke grade/board ke diagnostic questions abhi ready nahi hain.' }, { status: 404 });

  const { data: rows, error } = await db
    .from('questions')
    .select('id, text, options, subject_id, chapter_id, subjects(name), chapters(name)')
    .in('subject_id', subjectIds)
    .eq('type', 'MCQ')
    .limit(80);
  if (error) return NextResponse.json({ status: 'error', error: 'Diagnostic questions load nahi huay.' }, { status: 500 });

  const questions = shuffle((rows || []).filter((row: any) => Array.isArray(row.options) && row.options.length >= 2)).slice(0, 12);
  if (questions.length < 5) return NextResponse.json({ status: 'error', error: 'Diagnostic ke liye kam az kam 5 curated MCQs required hain.' }, { status: 404 });
  return NextResponse.json({
    status: 'success',
    data: {
      questions: questions.map((row: any) => ({
        id: row.id,
        text: row.text,
        options: row.options,
        subjectId: row.subject_id,
        subjectName: Array.isArray(row.subjects) ? row.subjects[0]?.name : row.subjects?.name,
        chapterId: row.chapter_id,
        chapterName: Array.isArray(row.chapters) ? row.chapters[0]?.name : row.chapters?.name,
      })),
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const questionIds = answers.map((item: any) => String(item?.questionId || '')).filter(Boolean).slice(0, 30);
  if (questionIds.length < 5) return NextResponse.json({ status: 'error', error: 'Diagnostic complete karne ke liye answers required hain.' }, { status: 400 });

  const db = createServiceClient() as any;
  const { data: questions, error } = await db.from('questions').select('id, chapter_id, correct_answer').in('id', questionIds);
  if (error || !questions?.length) return NextResponse.json({ status: 'error', error: 'Diagnostic answer key load nahi hui.' }, { status: 500 });
  const answerMap = new Map(answers.map((item: any) => [String(item.questionId), item.answer]));
  const chapterScores = new Map<string, { correct: number; total: number }>();
  let correct = 0;
  for (const question of questions) {
    const selected = answerMap.get(question.id);
    const expected = typeof question.correct_answer === 'object' && question.correct_answer !== null
      ? (question.correct_answer.index ?? question.correct_answer.answer ?? question.correct_answer.value)
      : question.correct_answer;
    const isCorrect = String(selected) === String(expected);
    if (isCorrect) correct += 1;
    if (question.chapter_id) {
      const current = chapterScores.get(question.chapter_id) || { correct: 0, total: 0 };
      current.total += 1;
      if (isCorrect) current.correct += 1;
      chapterScores.set(question.chapter_id, current);
    }
  }
  const score = Math.round((correct / questions.length) * 100);
  await db.from('diagnostic_attempts').insert({ student_id: user.id, question_ids: questionIds, answers: Object.fromEntries(answerMap), score });
  for (const [chapterId, result] of chapterScores) {
    const mastery = Math.round((result.correct / result.total) * 100);
    const { data: previous } = await db.from('chapter_mastery').select('attempts').eq('student_id', user.id).eq('chapter_id', chapterId).maybeSingle();
    await db.from('chapter_mastery').upsert({ student_id: user.id, chapter_id: chapterId, mastery, attempts: Number(previous?.attempts || 0) + 1, last_attempt_at: new Date().toISOString() }, { onConflict: 'student_id,chapter_id' });
  }
  return NextResponse.json({ status: 'success', data: { score, correct, total: questions.length, mastery: Array.from(chapterScores, ([chapterId, result]) => ({ chapterId, mastery: Math.round((result.correct / result.total) * 100) })) } });
}
