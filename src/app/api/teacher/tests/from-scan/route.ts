import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isTeacherAuthorized } from '@/lib/teacher/authorization';

function sanitizeQuestion(q: any) {
  if (Array.isArray(q?.opts)) return { ...q, q: String(q.q || '').slice(0, 2000), opts: q.opts.map((x: any) => String(x).slice(0, 500)).slice(0, 4) };
  return { ...q, q: String(q?.q || '').slice(0, 5000), marks: Math.min(50, Math.max(1, Number(q?.marks || 1))), modelAnswer: String(q?.modelAnswer || q?.guide || '').slice(0, 5000) };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  if (!(await isTeacherAuthorized(supabase, user.id))) return NextResponse.json({ error: 'Teacher access is required.' }, { status: 403 });

  const body = await req.json();
  const paper = body.paper && typeof body.paper === 'object' ? body.paper : null;
  if (!paper) return NextResponse.json({ error: 'Generated paper is required.' }, { status: 400 });

  const snapshot = {
    ...paper,
    mcqs: Array.isArray(paper.mcqs) ? paper.mcqs.map(sanitizeQuestion) : [],
    shortQs: Array.isArray(paper.shortQs) ? paper.shortQs.map(sanitizeQuestion) : [],
    longQs: Array.isArray(paper.longQs) ? paper.longQs.map(sanitizeQuestion) : [],
  };
  const totalMarks = Number(snapshot.totalMarks || snapshot.mcqs.length + snapshot.shortQs.reduce((s: number, q: any) => s + Number(q.marks || 3), 0) + snapshot.longQs.reduce((s: number, q: any) => s + Number(q.marks || 8), 0));
  const title = String(body.title || snapshot.title || 'Scanned Pages Test').trim().slice(0, 120);
  const service = createServiceClient() as any;
  const { data: inserted, error } = await service.from('teacher_generated_tests').insert({
    created_by: user.id,
    title,
    grade_level: String(body.gradeLevel || '').slice(0, 30) || null,
    institution_name: String(body.institutionName || '').trim().slice(0, 100) || null,
    difficulty: 'MIXED',
    mcq_count: snapshot.mcqs.length,
    short_count: snapshot.shortQs.length,
    long_count: snapshot.longQs.length,
    total_marks: totalMarks,
    duration_minutes: Math.max(15, Number(snapshot.timeAllowed || 45)),
    include_answer_key: true,
    plan_tier: body.planTier === 'ELITE' ? 'ELITE' : body.planTier === 'PRO' ? 'PRO' : 'FREE',
    school_class: String(body.gradeLevel || '').slice(0, 30) || null,
    paper_snapshot: { ...snapshot, source: 'scanned_pages', generatedAt: new Date().toISOString(), totalMarks },
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const questions = [...snapshot.mcqs, ...snapshot.shortQs, ...snapshot.longQs];
  if (inserted?.id && questions.length) {
    await service.from('teacher_generated_test_items').insert(questions.map((q: any, i: number) => ({ test_id: inserted.id, section: Array.isArray(q.opts) ? 'MCQ' : i < snapshot.mcqs.length + snapshot.shortQs.length ? 'WRITTEN' : 'LONG', position: i, marks: Number(q.marks || 1), question_snapshot: q })));
  }
  return NextResponse.json({ testId: inserted.id, title });
}
