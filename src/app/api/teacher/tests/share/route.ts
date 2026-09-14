import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotificationsIfEnabled } from '@/lib/notifications/preferences';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });

  const body = await req.json();
  const testId = String(body.testId || '');
  const classId = String(body.classId || '');
  const requestedStudentIds = Array.isArray(body.studentIds) ? body.studentIds.map(String).filter(Boolean) : [];
  const dueAt = body.dueAt ? new Date(body.dueAt).toISOString() : null;
  if (!testId || !classId) return NextResponse.json({ error: 'Test and class are required.' }, { status: 400 });

  const db = supabase as any;
  const service = createServiceClient() as any;
  const [{ data: test }, { data: klass }] = await Promise.all([
    db.from('teacher_generated_tests').select('id, created_by, title, paper_snapshot').eq('id', testId).maybeSingle(),
    db.from('teacher_classes').select('id, teacher_id, name').eq('id', classId).maybeSingle(),
  ]);
  if (!test || test.created_by !== user.id) return NextResponse.json({ error: 'Test access denied.' }, { status: 403 });
  if (!klass || klass.teacher_id !== user.id) return NextResponse.json({ error: 'Class access denied.' }, { status: 403 });

  const { data: enrollments } = await db.from('class_enrollments').select('student_id').eq('class_id', classId);
  const enrolledIds = new Set((enrollments || []).map((row: any) => String(row.student_id)));
  const studentIds = (requestedStudentIds.length ? requestedStudentIds : Array.from(enrolledIds)).filter((id) => enrolledIds.has(id));
  if (!studentIds.length) return NextResponse.json({ error: 'No enrolled students selected.' }, { status: 409 });

  const snapshot = test.paper_snapshot || {};
  const questions = [
    ...(snapshot.mcqs || []), ...(snapshot.shortQuestions || []), ...(snapshot.longQuestions || []),
    ...(snapshot.letterQuestions || []), ...(snapshot.vocabQuestions || []), ...(snapshot.grammarQuestions || []),
    ...(snapshot.numericalQuestions || []), ...(snapshot.extraQuestions || []),
  ];
  if (!questions.length) return NextResponse.json({ error: 'This test has no questions to share.' }, { status: 409 });

  const totalMarks = Number(snapshot.totalMarks || questions.reduce((sum: number, q: any) => sum + Number(q.marks || 1), 0));
  const rows: any[] = [];
  for (const studentId of studentIds) {
    const { data: existing } = await service
      .from('teacher_test_shares')
      .select('id, quiz_session_id')
      .eq('test_id', testId)
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .maybeSingle();

    let quizSessionId = existing?.quiz_session_id || null;
    if (!quizSessionId) {
      const { data: quiz, error: quizError } = await service.from('quiz_sessions').insert({
        user_id: studentId,
        subject_id: snapshot.subject?.id || null,
        chapter_ids: snapshot.chapter?.id ? [snapshot.chapter.id] : [],
        questions,
        current_index: 0,
        answers: {},
        status: 'NOT_STARTED',
        mode: 'TEST',
        total_marks: totalMarks,
        class_id: classId,
      }).select('id').single();
      if (quizError) return NextResponse.json({ error: quizError.message }, { status: 500 });
      quizSessionId = quiz.id;
    }

    const { data: share, error: shareError } = await service.from('teacher_test_shares').upsert({
      test_id: testId,
      class_id: classId,
      teacher_id: user.id,
      student_id: studentId,
      quiz_session_id: quizSessionId,
      status: 'assigned',
      due_at: dueAt,
    }, { onConflict: 'test_id,class_id,student_id' }).select('id, student_id, status, due_at').single();
    if (shareError) return NextResponse.json({ error: shareError.message }, { status: 500 });
    rows.push(share);
  }

  if (rows.length) {
    await createNotificationsIfEnabled(service, 'studyReminders', rows.map((row: any) => ({
      user_id: row.student_id,
      type: 'SYSTEM',
      title: 'New teacher test assigned',
      message: `${test.title}${dueAt ? ` · Due ${new Date(dueAt).toLocaleString()}` : ''}`,
      link: `/teacher/shared-tests/${row.id}`,
    })));
  }

  return NextResponse.json({ shared: true, count: rows.length, shares: rows, className: klass.name, title: test.title });
}
