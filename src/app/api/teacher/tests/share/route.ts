import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });

  const body = await req.json();
  const testId = String(body.testId || '');
  const classId = String(body.classId || '');
  if (!testId || !classId) return NextResponse.json({ error: 'Test and class are required.' }, { status: 400 });

  const db = supabase as any;
  const [{ data: test }, { data: klass }] = await Promise.all([
    db.from('teacher_generated_tests').select('id, created_by, title, paper_snapshot').eq('id', testId).maybeSingle(),
    db.from('teacher_classes').select('id, teacher_id').eq('id', classId).maybeSingle(),
  ]);
  if (!test || test.created_by !== user.id) return NextResponse.json({ error: 'Test access denied.' }, { status: 403 });
  if (!klass || klass.teacher_id !== user.id) return NextResponse.json({ error: 'Class access denied.' }, { status: 403 });

  const snapshot = test.paper_snapshot || {};
  const questions = [
    ...(snapshot.mcqs || []),
    ...(snapshot.shortQuestions || []),
    ...(snapshot.longQuestions || []),
    ...(snapshot.letterQuestions || []),
    ...(snapshot.vocabQuestions || []),
    ...(snapshot.grammarQuestions || []),
    ...(snapshot.numericalQuestions || []),
    ...(snapshot.extraQuestions || []),
  ];
  if (!questions.length) return NextResponse.json({ error: 'This test has no questions to share.' }, { status: 409 });

  const totalMarks = Number(snapshot.totalMarks || questions.reduce((sum: number, q: any) => sum + Number(q.marks || 1), 0));
  const { data: quiz, error } = await db.from('quiz_sessions').insert({
    user_id: user.id,
    subject_id: snapshot.subject?.id || null,
    questions,
    current_index: 0,
    answers: {},
    status: 'NOT_STARTED',
    mode: 'TEST',
    total_marks: totalMarks,
    class_id: classId,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ quizId: quiz.id, title: test.title, shared: true });
}
