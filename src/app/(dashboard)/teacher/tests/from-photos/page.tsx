import { redirect } from 'next/navigation';
import { Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isTeacherAuthorized } from '@/lib/teacher/authorization';
import { TeacherPhotoTestClient } from '@/components/features/teacher/TeacherPhotoTestClient';

export const metadata = { title: 'Photo to Test | Teacher Test Studio' };

export default async function TeacherPhotoTestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!(await isTeacherAuthorized(supabase, user.id))) redirect('/dashboard');
  const [{ data: profile }, { data: classes }] = await Promise.all([
    supabase.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle(),
    supabase.from('teacher_classes').select('id, name').eq('teacher_id', user.id).order('name'),
  ]);
  const planTier = ['PRO', 'ELITE'].includes(String(profile?.subscription_tier)) ? String(profile?.subscription_tier) : 'FREE';
  return <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6"><div><p className="text-sm font-semibold text-violet-500">Teacher Test Studio</p><h1 className="text-2xl font-black flex items-center gap-2"><Camera className="h-6 w-6" />Photo to Test</h1><p className="text-muted-foreground mt-1 text-sm">Capture textbook pages and turn them into a test you can save and share.</p></div><TeacherPhotoTestClient classes={classes || []} planTier={planTier} /></main>;
}
