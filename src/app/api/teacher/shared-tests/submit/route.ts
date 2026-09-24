import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });

  const body = await req.json();
  const shareId = String(body.shareId || '');
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  if (!shareId) return NextResponse.json({ error: 'Share id is required.' }, { status: 400 });

  const service = createServiceClient() as any;
  const { data: share } = await service
    .from('teacher_test_shares')
    .select('id, student_id, quiz_session_id, status, due_at, teacher_generated_tests(title, paper_snapshot)')
    .eq('id', shareId)
    .maybeSingle();
  if (!share || share.student_id !== user.id) return NextResponse.json({ error: 'Test access denied.' }, { status: 403 });
  if (share.status === 'completed') return NextResponse.json({ error: 'This test has already been submitted.' }, { status: 409 });
  if (share.due_at && new Date(share.due_at).getTime() < Date.now()) return NextResponse.json({ error: 'This test is past its deadline.' }, { status: 410 });

  const test = Array.isArray(share.teacher_generated_tests) ? share.teacher_generated_tests[0] : share.teacher_generated_tests;
  const questions = [
    ...(test?.paper_snapshot?.mcqs || []), ...(test?.paper_snapshot?.shortQuestions || []), ...(test?.paper_snapshot?.longQuestions || []),
    ...(test?.paper_snapshot?.letterQuestions || []), ...(test?.paper_snapshot?.vocabQuestions || []), ...(test?.paper_snapshot?.grammarQuestions || []),
    ...(test?.paper_snapshot?.numericalQuestions || []), ...(test?.paper_snapshot?.extraQuestions || []),
  ];
  const mcqs = questions.filter((q: any) => Array.isArray(q.opts) && q.opts.length >= 2);
  let mcqScore = 0;
  for (let i = 0; i < mcqs.length; i++) {
    const key = mcqs[i].id || String(i);
    if (Number(answers[key]) === Number(mcqs[i].correct)) mcqScore += Number(mcqs[i].marks || 1);
  }
  const mcqTotal = mcqs.reduce((sum: number, q: any) => sum + Number(q.marks || 1), 0);

  if (share.quiz_session_id) {
    await service.from('quiz_sessions').update({
      answers,
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      score: mcqScore,
      correct_count: mcqs.filter((_: any, i: number) => {
        const key = mcqs[i].id || String(i);
        return Number(answers[key]) === Number(mcqs[i].correct);
      }).length,
      incorrect_count: mcqs.filter((_: any, i: number) => {
        const key = mcqs[i].id || String(i);
        return answers[key] !== undefined && Number(answers[key]) !== Number(mcqs[i].correct);
      }).length,
      skipped_count: mcqs.filter((_: any, i: number) => answers[mcqs[i].id || String(i)] === undefined).length,
    }).eq('id', share.quiz_session_id).eq('user_id', user.id);
  }
  const { error: shareError } = await service.from('teacher_test_shares').update({
    status: 'completed',
    score: mcqTotal ? mcqScore : 0,
    completed_at: new Date().toISOString(),
  }).eq('id', shareId).eq('student_id', user.id);
  if (shareError) return NextResponse.json({ error: shareError.message }, { status: 500 });

  return NextResponse.json({ submitted: true, mcqScore, mcqTotal, writtenPending: questions.length > mcqs.length });
}
