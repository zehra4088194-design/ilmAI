import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { TeacherPhotoTestClient } from '@/components/features/teacher/TeacherPhotoTestClient';

export const metadata = { title: 'Photo → Test | College Teacher' };

export default async function CollegeTeacherPhotoTestPage() {
  const { user, context, supabase } = await requireCollegeContext('academics.read');
  if (!user) redirect('/login');
  if (!context || !['owner','admin','coordinator','teacher'].includes(context.membership.member_role)) redirect('/college');
  const [{ data: profile }, { data: classes }] = await Promise.all([
    supabase.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle(),
    (supabase as any).from('teacher_classes').select('id,name').eq('teacher_id',user.id).order('name'),
  ]);
  const planTier = ['PRO','ELITE'].includes(String(profile?.subscription_tier)) ? String(profile.subscription_tier) : 'FREE';
  return <main className="mx-auto max-w-5xl p-4 sm:p-6"><p className="mb-1 text-sm font-semibold text-violet-500">{context.organization.name} · ilm AI</p><h1 className="mb-5 text-3xl font-black">Photo → Test</h1><TeacherPhotoTestClient classes={classes || []} planTier={planTier}/></main>;
}
