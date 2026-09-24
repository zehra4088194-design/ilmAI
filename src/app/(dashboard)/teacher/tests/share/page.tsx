import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { TeacherTestShareForm } from '@/components/features/teacher/TeacherTestShareForm';

export const metadata: Metadata = { title: 'Share Test | Teacher' };

export default async function TeacherTestSharePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !['teacher', 'admin'].includes(String(profile.role))) redirect('/dashboard');

  const [{ data: tests }, { data: classes }] = await Promise.all([
    supabase.from('teacher_generated_tests').select('id, title, created_at, total_marks').eq('created_by', user.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('teacher_classes').select('id, name').eq('teacher_id', user.id).order('created_at', { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><Link href="/teacher/tests" className="text-xs text-muted-foreground hover:underline">← Test Paper Studio</Link><h1 className="mt-2 text-2xl font-bold">Share a Test</h1><p className="text-sm text-muted-foreground">Choose one of your generated papers and one of your classes. Students enrolled in that class will get the test in their class test flow.</p></div>
      <TeacherTestShareForm tests={(tests as any) || []} classes={(classes as any) || []} />
    </div>
  );
}
