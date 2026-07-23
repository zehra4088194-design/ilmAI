import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getCorrectOptionIndex, normalizeQuestionOptions } from '@/lib/diagnostic/questions';
import { recordMistakeWithRevision, updateChapterMastery } from '@/lib/learning/mastery';

export const runtime = 'nodejs';

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

const QUESTIONS_PER_SUBJECT = 5;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { status: 'error', error: 'Please sign in to start the diagnostic test.' },
      { status: 401 }
    );

  const { data: profile } = await supabase
    .from('profiles')
    .select('board, grade_level, education_level')
    .eq('id', user.id)
    .single();
  const db = createServiceClient() as any;
  let subjectQuery = db.from('subjects').select('id, name').eq('is_active', true);
  if (profile?.board) subjectQuery = subjectQuery.contains('boards', [profile.board]);
  if (profile?.grade_level) subjectQuery = subjectQuery.contains('grade_levels', [profile.grade_level]);
  const { data: subjects } = await subjectQuery;
  const subjectIds = (subjects || []).map((subject: { id: string }) => subject.id);
  if (!subjectIds.length)
    return NextResponse.json(
      { status: 'error', error: 'Diagnostic questions are not ready for your selected grade and board yet.' },
      { status: 404 }
    );

  const questionResults = await Promise.all(
    subjectIds.map((subjectId: string) =>
      db
        .from('questions')
        .select('id, text, options, subject_id, chapter_id, is_verified, subjects(name), chapters(name)')
        .eq('subject_id', subjectId)
        .eq('type', 'MCQ')
        .order('is_verified', { ascending: false })
        .limit(100)
    )
  );
  if (questionResults.every((result: any) => result.error))
    return NextResponse.json({ status: 'error', error: 'Diagnostic questions could not be loaded.' }, { status: 500 });
  // Diagnostic questions always come from the saved, curriculum-linked question bank.
  // Each subject that has enough valid MCQs contributes five random questions.
  const questions = questionResults.flatMap((result: any) => {
    const validQuestions = (result.data || []).filter((row: any) => normalizeQuestionOptions(row.options).length >= 2);
    return shuffle(validQuestions).slice(0, QUESTIONS_PER_SUBJECT);
  });
  if (questions.length < 5)
    return NextResponse.json(
      { status: 'error', error: 'At least five saved MCQs are required before a diagnostic can start.' },
      { status: 404 }
    );
  return NextResponse.json({
    status: 'success',
    data: {
      questions: questions.map((row: any) => ({
        id: row.id,
        text: row.text,
        options: normalizeQuestionOptions(row.options),
        subjectId: row.subject_id,
        subjectName: Array.isArray(row.subjects) ? row.subjects[0]?.name : row.subjects?.name,
        chapterId: row.chapter_id,
        chapterName: Array.isArray(row.chapters) ? row.chapters[0]?.name : row.chapters?.name,
      })),
      questionsPerSubject: QUESTIONS_PER_SUBJECT,
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { status: 'error', error: 'Please sign in to submit the diagnostic test.' },
      { status: 401 }
    );
  const body = await req.json().catch(() => ({}));
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const questionIds = answers
    .map((item: any) => String(item?.questionId || ''))
    .filter(Boolean)
    .slice(0, 30);
  if (questionIds.length < 5)
    return NextResponse.json(
      { status: 'error', error: 'Answer at least five questions to complete the diagnostic test.' },
      { status: 400 }
    );

  const db = createServiceClient() as any;
  const { data: questions, error } = await db
    .from('questions')
    .select('id, text, subject_id, chapter_id, concept_id, options, correct_answer, explanation')
    .in('id', questionIds);
  if (error || !questions?.length)
    return NextResponse.json(
      { status: 'error', error: 'The diagnostic answer key could not be loaded.' },
      { status: 500 }
    );
  const answerMap = new Map(answers.map((item: any) => [String(item.questionId), item.answer]));
  const chapterScores = new Map<string, { correct: number; total: number }>();
  let correct = 0;
  for (const question of questions) {
    const selected = answerMap.get(question.id);
    const expected = getCorrectOptionIndex(question.options, question.correct_answer);
    const isCorrect = expected !== null && Number(selected) === expected;
    if (isCorrect) correct += 1;
    if (question.chapter_id) {
      const current = chapterScores.get(question.chapter_id) || { correct: 0, total: 0 };
      current.total += 1;
      if (isCorrect) current.correct += 1;
      chapterScores.set(question.chapter_id, current);
    }
    if (!isCorrect) {
      await recordMistakeWithRevision(db, {
        studentId: user.id,
        questionId: question.id,
        subjectId: question.subject_id,
        chapterId: question.chapter_id,
        conceptId: question.concept_id,
        source: 'diagnostic',
        questionText: question.text || 'Diagnostic question',
        selectedAnswer: selected == null ? null : String(selected),
        correctAnswer: expected == null ? String(question.correct_answer || '') : String(expected),
        explanation: question.explanation || null,
      });
    }
  }
  const score = Math.round((correct / questions.length) * 100);
  await db
    .from('diagnostic_attempts')
    .insert({ student_id: user.id, question_ids: questionIds, answers: Object.fromEntries(answerMap), score });
  for (const [chapterId, result] of chapterScores) {
    await updateChapterMastery(db, {
      studentId: user.id,
      chapterId,
      correct: result.correct,
      incorrect: result.total - result.correct,
      source: 'diagnostic',
    });
  }
  return NextResponse.json({
    status: 'success',
    data: {
      score,
      correct,
      total: questions.length,
      mastery: Array.from(chapterScores, ([chapterId, result]) => ({
        chapterId,
        mastery: Math.round((result.correct / result.total) * 100),
      })),
    },
  });
}
