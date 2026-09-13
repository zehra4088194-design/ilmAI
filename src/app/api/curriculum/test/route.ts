import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

async function readNode(db: ReturnType<typeof createServiceClient>, userId: string, nodeId: string) {
  const { data: node, error } = await db
    .from('curriculum_nodes')
    .select('id,book_id,title,number,is_published,curriculum_books!inner(status,scope_type,organization_id)')
    .eq('id', nodeId)
    .eq('is_published', true)
    .eq('curriculum_books.status', 'published')
    .single();
  if (error || !node) return null;
  const book = Array.isArray((node as any).curriculum_books) ? (node as any).curriculum_books[0] : (node as any).curriculum_books;
  if (book.scope_type === 'global') return node;
  if (!book.organization_id) return null;
  const table = book.scope_type === 'school' ? 'school_memberships' : 'college_memberships';
  const { data: membership } = await db.from(table).select('id').eq('organization_id', book.organization_id).eq('profile_id', userId).eq('status', 'active').maybeSingle();
  return membership ? node : null;
}

export async function POST(req: NextRequest) {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }

  const nodeId = String(body?.node_id || '');
  const db = createServiceClient();
  const node = await readNode(db, user.id, nodeId);
  if (!node) return NextResponse.json({ error: 'Curriculum topic not found or unavailable.' }, { status: 404 });

  if (body?.action === 'submit') {
    const attemptId = String(body?.attempt_id || '');
    const answers = body?.answers && typeof body.answers === 'object' ? body.answers : {};
    const { data: attempt } = await db
      .from('curriculum_test_attempts')
      .select('id,node_id,student_id,question_ids,total_marks,status')
      .eq('id', attemptId)
      .eq('student_id', user.id)
      .eq('status', 'in_progress')
      .single();
    if (!attempt || attempt.node_id !== nodeId) return NextResponse.json({ error: 'Test attempt not found.' }, { status: 404 });

    const { data: questions } = await db
      .from('curriculum_questions')
      .select('id,question_type,marks,options,exact_answer')
      .in('id', attempt.question_ids);

    let correct = 0;
    let mcqTotal = 0;
    let mcqScore = 0;
    for (const q of questions || []) {
      const marks = Number(q.marks || 1);
      if (q.question_type !== 'mcq' && q.question_type !== 'true_false') continue;
      mcqTotal += marks;
      const submitted = answers[q.id] == null ? '' : String(answers[q.id]).trim();
      const expected = q.exact_answer == null ? '' : String(q.exact_answer).trim();
      if (submitted && expected && submitted.toLowerCase() === expected.toLowerCase()) {
        correct += 1;
        mcqScore += marks;
      }
    }

    const totalMarks = Number(attempt.total_marks || mcqTotal || 0);
    const percentage = totalMarks > 0 ? Number(((mcqScore / totalMarks) * 100).toFixed(2)) : 0;
    const { error } = await db.from('curriculum_test_attempts').update({
      answers,
      score: mcqScore,
      total_marks: totalMarks,
      correct_count: correct,
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', attempt.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      result: { score: mcqScore, total_marks: totalMarks, percentage, correct_count: correct, mcq_total: mcqTotal },
      note: (questions || []).some((q) => q.question_type === 'short' || q.question_type === 'long' || q.question_type === 'numerical')
        ? 'Written answers require teacher review.'
        : null,
    });
  }

  const requested = Math.min(Math.max(Number(body?.count || 10), 1), 50);
  const requestedTypes = Array.isArray(body?.types) && body.types.length ? body.types : ['mcq', 'short', 'long', 'numerical', 'exercise'];
  const { data: pool } = await db
    .from('curriculum_questions')
    .select('id,question_type,exact_text,options,marks,difficulty,source_page')
    .eq('node_id', nodeId)
    .in('question_type', requestedTypes)
    .order('ordinal')
    .limit(200);

  const shuffled = [...(pool || [])].sort(() => Math.random() - 0.5).slice(0, requested);
  if (!shuffled.length) return NextResponse.json({ error: 'No saved questions are available for this sub-topic yet.' }, { status: 409 });

  const totalMarks = shuffled.reduce((sum, q) => sum + Number(q.marks || 1), 0);
  const { data: attempt, error } = await db.from('curriculum_test_attempts').insert({
    node_id: nodeId,
    student_id: user.id,
    question_ids: shuffled.map((q) => q.id),
    total_marks: totalMarks,
  }).select('id').single();
  if (error || !attempt) return NextResponse.json({ error: error?.message || 'Unable to start test.' }, { status: 500 });

  return NextResponse.json({
    attempt_id: attempt.id,
    node: { id: node.id, number: node.number, title: node.title },
    questions: shuffled.map((q) => ({ id: q.id, question_type: q.question_type, exact_text: q.exact_text, options: q.options, marks: q.marks, difficulty: q.difficulty, source_page: q.source_page })),
  });
}
