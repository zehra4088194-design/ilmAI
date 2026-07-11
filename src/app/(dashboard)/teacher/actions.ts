'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { gatewayChat } from '@/lib/ai/gateway';

function code() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createTeacherClass(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'teacher' && profile?.role !== 'admin') redirect('/dashboard');
  const { data, error } = await db.from('teacher_classes').insert({
    teacher_id: user.id,
    name: formData.get('name'),
    subject_id: formData.get('subject_id') || null,
    grade_level: formData.get('grade_level') || null,
    board: formData.get('board') || null,
    join_code: code(),
  }).select('id').single();
  if (error) throw new Error(error.message);
  revalidatePath('/teacher');
  redirect(`/teacher/classes/${data.id}`);
}

export async function joinTeacherClass(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const service = createServiceClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const joinCode = String(formData.get('join_code') || '').trim().toUpperCase();
  const { data: klass } = await db.from('teacher_classes').select('id').eq('join_code', joinCode).single();
  if (!klass) redirect('/join-class?error=not-found');
  await service.from('class_enrollments').upsert({ class_id: klass.id, student_id: user.id }, { onConflict: 'class_id,student_id' });
  revalidatePath('/join-class');
  redirect(`/teacher/classes/${klass.id}`);
}

export async function createClassAssignment(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const service = createServiceClient() as any;
  const classId = String(formData.get('class_id'));
  const { data: assignment } = await db.from('class_assignments').insert({
    class_id: formData.get('class_id'),
    title: formData.get('title'),
    description: formData.get('description'),
    due_date: formData.get('due_date') || null,
    max_marks: Number(formData.get('max_marks') || 0) || null,
    attachment_url: formData.get('attachment_url') || null,
  }).select('id, title').single();

  const { data: enrollments } = await db.from('class_enrollments').select('student_id').eq('class_id', classId);
  if (assignment && enrollments?.length) {
    await service.from('notifications').insert(enrollments.map((row: { student_id: string }) => ({
      user_id: row.student_id,
      type: 'SYSTEM',
      title: 'New class assignment',
      message: assignment.title,
      link: `/teacher/classes/${classId}`,
    })));
  }
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function createClassLecture(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const classId = String(formData.get('class_id'));
  await db.from('class_lectures').insert({
    class_id: classId,
    title: formData.get('title'),
    video_url: formData.get('video_url') || null,
    resource_url: formData.get('resource_url') || null,
    chapter_id: formData.get('chapter_id') || null,
  });
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function markClassAttendance(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const classId = String(formData.get('class_id'));
  const studentId = String(formData.get('student_id'));
  const status = String(formData.get('status') || 'present');
  const sessionDate = String(formData.get('session_date') || new Date().toISOString().slice(0, 10));
  const { data: { user } } = await supabase.auth.getUser();
  await db.from('class_attendance').upsert({
    class_id: classId,
    student_id: studentId,
    session_date: sessionDate,
    status,
    marked_by: user?.id || null,
  }, { onConflict: 'class_id,student_id,session_date' });
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function createClassQuizTemplate(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const classId = String(formData.get('class_id'));
  const count = Math.min(Math.max(Number(formData.get('count') || 10), 1), 30);
  const { data: klass } = await db.from('teacher_classes').select('subject_id').eq('id', classId).single();
  if (!klass?.subject_id) return { status: 'error', error: 'Class subject required' };
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('subject_id', klass.subject_id)
    .limit(count);
  if (!questions?.length) return { status: 'error', error: 'No question bank items found' };
  await supabase.from('quiz_sessions').insert({
    user_id: user.id,
    subject_id: klass.subject_id,
    questions,
    current_index: 0,
    answers: {},
    status: 'NOT_STARTED',
    mode: 'TEST',
    total_marks: questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0),
    class_id: classId,
  } as any);
  revalidatePath(`/teacher/classes/${classId}`);
  return { status: 'success' };
}

export async function gradeSubmission(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const submissionId = String(formData.get('submission_id'));
  const classId = String(formData.get('class_id'));
  await db.from('assignment_submissions').update({
    marks_awarded: Number(formData.get('marks_awarded') || 0),
    feedback: formData.get('feedback') || null,
    graded_at: new Date().toISOString(),
  }).eq('id', submissionId);
  revalidatePath(`/teacher/classes/${classId}`);
}

export async function draftAiSubmissionFeedback(formData: FormData) {
  const supabase = await createClient();
  const db = supabase as any;
  const submissionId = String(formData.get('submission_id'));
  const assignmentId = String(formData.get('assignment_id'));
  const classId = String(formData.get('class_id'));
  const result = await gatewayChat({
    provider: 'groq',
    tier: 'mini',
    messages: [
      { role: 'system', content: 'Draft concise teacher feedback for a student assignment. The teacher will review and edit it before saving. Return plain text only.' },
      { role: 'user', content: `Assignment: ${formData.get('assignment_title')}\nSubmission:\n${formData.get('submission_text') || ''}` },
    ],
    maxTokens: 500,
    temperature: 0.35,
  });
  await db.from('assignment_submissions').update({ ai_feedback: result.text }).eq('id', submissionId);
  revalidatePath(`/teacher/classes/${classId}/assignments/${assignmentId}/grade`);
}
