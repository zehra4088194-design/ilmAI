import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createClassAssignment, createClassLecture, createClassQuizTemplate, markClassAttendance } from '../../actions';

export const metadata: Metadata = { title: 'Class' };

export default async function TeacherClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const db = supabase as any;
  const { data: klass } = await db.from('teacher_classes').select('*').eq('id', id).single();
  const [{ data: enrollments }, { data: assignments }, { data: lectures }, { data: attendance }, { data: chapters }, { data: quizTemplates }] = await Promise.all([
    db.from('class_enrollments').select('student_id, profiles(full_name, xp)').eq('class_id', id),
    db.from('class_assignments').select('*').eq('class_id', id).order('created_at', { ascending: false }),
    db.from('class_lectures').select('*').eq('class_id', id).order('created_at', { ascending: false }),
    db.from('class_attendance').select('*').eq('class_id', id).order('session_date', { ascending: false }).limit(50),
    (klass as any)?.subject_id
      ? supabase.from('chapters').select('id, name').eq('subject_id', (klass as any).subject_id).order('order_index')
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('quiz_sessions').select('id, status, total_marks, questions, started_at').eq('class_id', id as any).order('started_at', { ascending: false }).limit(10),
  ]);
  const students = enrollments || [];
  const studentIds = students.map((row: any) => row.student_id);
  const [{ data: quizScores }, { data: studyRows }] = studentIds.length
    ? await Promise.all([
        supabase.from('quiz_sessions').select('user_id, score, correct_count, incorrect_count, chapter_ids').in('user_id', studentIds).eq('status', 'COMPLETED').limit(100),
        supabase.from('study_sessions').select('user_id, duration, xp_earned').in('user_id', studentIds).limit(100),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }];
  const leaderboard = students
    .map((student: any) => ({
      ...student,
      xp: studyRows?.filter((row: any) => row.user_id === student.student_id).reduce((sum: number, row: any) => sum + (row.xp_earned || 0), 0) || 0,
      avgScore: Math.round((quizScores?.filter((row: any) => row.user_id === student.student_id).reduce((sum: number, row: any) => sum + (row.score || 0), 0) || 0) / Math.max(1, quizScores?.filter((row: any) => row.user_id === student.student_id).length || 0)),
    }))
    .sort((a: any, b: any) => b.xp - a.xp);
  const weakChapterCounts = new Map<string, number>();
  for (const row of quizScores || []) {
    if ((row.score || 0) >= 60) continue;
    for (const chapterId of row.chapter_ids || []) weakChapterCounts.set(chapterId, (weakChapterCounts.get(chapterId) || 0) + 1);
  }
  const chapterNames = new Map((chapters || []).map((chapter: any) => [chapter.id, chapter.name]));
  const weakChapters = Array.from(weakChapterCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const today = new Date().toISOString().slice(0, 10);
  async function handleCreateQuizTemplate(formData: FormData) {
    'use server';
    await createClassQuizTemplate(formData);
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><p className="text-sm text-violet-400">Join code {klass?.join_code}</p><h1 className="text-2xl font-bold">{klass?.name}</h1></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass rounded-xl p-5">
          <h2 className="mb-3 font-bold">Students ({students.length})</h2>
          <div className="space-y-2">{students.map((row: any) => <p key={row.student_id} className="rounded border p-2 text-sm">{row.profiles?.full_name || row.student_id}</p>)}</div>
        </section>
        <section className="glass rounded-xl p-5 lg:col-span-2">
          <h2 className="mb-3 font-bold">Assignments</h2>
          <form action={createClassAssignment} className="mb-4 grid gap-2">
            <input type="hidden" name="class_id" value={id} />
            <Input name="title" placeholder="Assignment title" required />
            <Textarea name="description" placeholder="Description" />
            <Input name="due_date" type="datetime-local" />
            <Input name="max_marks" type="number" placeholder="Max marks" />
            <Input name="attachment_url" placeholder="Attachment URL" />
            <Button size="sm" variant="gradient">Create assignment</Button>
          </form>
          <div className="space-y-2">
            {(assignments || []).map((assignment: any) => (
              <div key={assignment.id} className="flex items-center justify-between gap-3 rounded border p-3">
                <div><p className="font-semibold">{assignment.title}</p><p className="text-xs text-muted-foreground">{assignment.due_date || 'No due date'}</p></div>
                <Button asChild size="sm" variant="outline"><Link href={`/teacher/classes/${id}/assignments/${assignment.id}/grade`}>Grade</Link></Button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="glass rounded-xl p-5">
        <h2 className="mb-3 font-bold">Lectures</h2>
        <form action={createClassLecture} className="mb-4 grid gap-2 md:grid-cols-2">
          <input type="hidden" name="class_id" value={id} />
          <Input name="title" placeholder="Lecture title" required />
          <Input name="video_url" placeholder="Video URL" />
          <Input name="resource_url" placeholder="Resource URL" />
          <select name="chapter_id" className="h-10 rounded-lg border bg-background px-3 text-sm">
            <option value="">Chapter</option>
            {(chapters || []).map((chapter: any) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
          </select>
          <Button size="sm" variant="gradient">Add lecture</Button>
        </form>
        <div className="grid gap-2 md:grid-cols-2">{(lectures || []).map((lecture: any) => <p key={lecture.id} className="rounded border p-3">{lecture.title}</p>)}</div>
      </section>
      <section className="glass rounded-xl p-5">
        <h2 className="mb-3 font-bold">Attendance</h2>
        <div className="space-y-2">
          {students.map((row: any) => (
            <form key={row.student_id} action={markClassAttendance} className="flex flex-wrap items-center gap-2 rounded border p-2">
              <input type="hidden" name="class_id" value={id} />
              <input type="hidden" name="student_id" value={row.student_id} />
              <Input name="session_date" type="date" defaultValue={today} className="max-w-40" />
              <span className="min-w-40 flex-1 text-sm">{row.profiles?.full_name || row.student_id}</span>
              <select name="status" className="h-9 rounded border bg-background px-2 text-sm">
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>
              <Button size="sm" variant="outline">Mark</Button>
            </form>
          ))}
        </div>
      </section>
      <section className="glass rounded-xl p-5">
        <h2 className="mb-3 font-bold">Teacher Test Templates</h2>
        <form action={handleCreateQuizTemplate} className="mb-4 flex flex-wrap gap-2">
          <input type="hidden" name="class_id" value={id} />
          <Input name="count" type="number" defaultValue={10} min={1} max={30} className="max-w-32" />
          <Button size="sm" variant="gradient">Create from question bank</Button>
        </form>
        <div className="space-y-2">{(quizTemplates || []).map((quiz: any) => <p key={quiz.id} className="rounded border p-3 text-sm">{Array.isArray(quiz.questions) ? quiz.questions.length : 0} questions · {quiz.total_marks} marks · {quiz.status}</p>)}</div>
      </section>
      <section className="glass rounded-xl p-5">
        <h2 className="mb-3 font-bold">Analytics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold">Weak chapters</p>
            {weakChapters.length ? weakChapters.map(([chapterId, count]) => <p key={chapterId} className="rounded border p-2 text-sm">{chapterNames.get(chapterId) || chapterId}: {count} low-score attempts</p>) : <p className="text-sm text-muted-foreground">No weak chapter pattern yet.</p>}
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Class leaderboard</p>
            {leaderboard.map((row: any, index: number) => <p key={row.student_id} className="rounded border p-2 text-sm">{index + 1}. {row.profiles?.full_name || row.student_id} · {row.xp} XP · {row.avgScore}% avg</p>)}
          </div>
        </div>
      </section>
    </div>
  );
}
