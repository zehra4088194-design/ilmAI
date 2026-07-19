import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RoleAnalyticsClient } from '@/components/features/analytics/RoleAnalyticsClient';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Class Analytics' };

export default async function TeacherClassAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const db = supabase as any;
  const { data: klass } = await db.from('teacher_classes').select('id, name').eq('id', id).eq('teacher_id', user.id).maybeSingle();
  if (!klass) redirect('/teacher');

  const [{ data: enrollments }, { data: quizzes }, { data: assignments }, { data: attendance }] = await Promise.all([
    db.from('class_enrollments').select('student_id').eq('class_id', id),
    db.from('quiz_sessions').select('score, completed_at').eq('class_id', id).eq('status', 'COMPLETED').not('score', 'is', null).order('completed_at', { ascending: true }).limit(500),
    db.from('class_assignments').select('id, title').eq('class_id', id),
    db.from('class_attendance').select('status').eq('class_id', id).limit(1000),
  ]);

  // Load submissions only when assignments exist; this avoids a broad table read.
  const assignmentIds = (assignments || []).map((assignment: { id: string }) => assignment.id);
  const { data: realSubmissions } = assignmentIds.length
    ? await db.from('assignment_submissions').select('assignment_id, marks_awarded').in('assignment_id', assignmentIds)
    : { data: [] };

  const scoreRows = (quizzes || []).map((quiz: { score: number | null }) => Number(quiz.score || 0));
  const averageScore = scoreRows.length ? Math.round(scoreRows.reduce((sum: number, score: number) => sum + score, 0) / scoreRows.length) : 0;
  const trend = (quizzes || []).reduce((groups: Record<string, number[]>, quiz: { score: number | null; completed_at: string | null }) => {
    const key = quiz.completed_at ? new Date(quiz.completed_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : 'Recent';
    (groups[key] ||= []).push(Number(quiz.score || 0));
    return groups;
  }, {} as Record<string, number[]>);
  const trendPoints = (Object.entries(trend) as Array<[string, number[]]>).map(([label, values]) => ({
    label,
    value: Math.round(values.reduce((sum, score) => sum + score, 0) / values.length),
  }));
  const attendanceRows = (attendance || []) as Array<{ status: string }>;
  const presentCount = attendanceRows.filter((row) => row.status === 'present' || row.status === 'late').length;
  const attendanceRate = attendanceRows.length ? Math.round((presentCount / attendanceRows.length) * 100) : 0;
  const submittedCount = (realSubmissions || []).length;

  return (
    <RoleAnalyticsClient
      title={`${klass.name} Analytics`}
      subtitle="Live class performance, quiz trend, assignment activity, and attendance."
      cards={[
        { label: 'Students', value: (enrollments || []).length, detail: 'Currently enrolled' },
        { label: 'Average score', value: `${averageScore}%`, detail: `${scoreRows.length} completed quizzes` },
        { label: 'Assignments', value: `${submittedCount}/${(assignments || []).length}`, detail: 'Submissions recorded' },
        { label: 'Attendance', value: `${attendanceRate}%`, detail: `${attendanceRows.length} attendance records` },
      ]}
      trend={trendPoints}
      bars={[
        { label: 'Students', value: (enrollments || []).length },
        { label: 'Quizzes', value: scoreRows.length },
        { label: 'Submissions', value: submittedCount },
        { label: 'Attendance %', value: attendanceRate },
      ]}
      omitted={!trendPoints.length ? ['Quiz trend has not been recorded yet'] : []}
    />
  );
}
