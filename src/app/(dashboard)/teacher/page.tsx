import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Teacher Dashboard' };

export default async function TeacherPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  if (profile?.role !== 'teacher' && profile?.role !== 'admin') redirect('/dashboard');
  const { data: classes } = await supabase.from('teacher_classes' as any).select('*').eq('teacher_id', user!.id).order('created_at', { ascending: false });
  const classIds = (classes || []).map((klass: any) => klass.id);
  const today = new Date().toISOString().slice(0, 10);
  const [{ count: studentCount }, { count: pendingGrading }, { data: attendanceRows }] = classIds.length
    ? await Promise.all([
        supabase.from('class_enrollments' as any).select('id', { count: 'exact', head: true }).in('class_id', classIds),
        supabase.from('assignment_submissions' as any).select('id, class_assignments!inner(class_id)', { count: 'exact', head: true }).is('graded_at', null).in('class_assignments.class_id', classIds),
        supabase.from('class_attendance' as any).select('class_id').in('class_id', classIds).eq('session_date', today),
      ])
    : [{ count: 0 }, { count: 0 }, { data: [] as any[] }];
  const attendanceMarkedClasses = new Set((attendanceRows || []).map((row: any) => row.class_id)).size;
  const attendanceMissing = Math.max(0, classIds.length - attendanceMarkedClasses);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex justify-between gap-3"><div><p className="text-sm font-semibold text-violet-400">Teacher</p><h1 className="text-2xl font-bold">Classes</h1></div><Button asChild variant="gradient"><Link href="/teacher/classes/new">New class</Link></Button></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total students" value={studentCount || 0} />
        <Stat label="Pending grading" value={pendingGrading || 0} />
        <Stat label="Attendance missing today" value={attendanceMissing} />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {(classes || []).map((klass: any) => <Link key={klass.id} href={`/teacher/classes/${klass.id}`} className="glass rounded-xl p-5"><p className="font-bold">{klass.name}</p><p className="text-sm text-muted-foreground">Join code: {klass.join_code}</p></Link>)}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="glass rounded-xl p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>;
}
