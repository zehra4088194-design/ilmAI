import { createClient } from '@/lib/supabase/server';
import { ParentCommunicationDock } from '@/components/features/parent/ParentCommunicationDock';
import type { ReactNode } from 'react';

type ParentLayoutProps = { children: ReactNode };

export default async function ParentLayout({ children }: ParentLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return children;

  const [{ data: profile }, { data: links }] = await Promise.all([
    supabase.from('profiles').select('subscription_tier, role').eq('id', user.id).maybeSingle(),
    supabase
      .from('parent_student_links')
      .select('id, student_id, status')
      .eq('parent_id', user.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false }),
  ]);

  if (profile?.role !== 'parent' || profile.subscription_tier !== 'FREE' || !links?.length) return children;

  const studentIds = links
    .map((link) => link.student_id)
    .filter((studentId): studentId is string => Boolean(studentId));
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', studentIds);

  const studentMap = new Map((students || []).map((student) => [student.id, student]));
  const communicationLinks = links
    .filter((link): link is typeof link & { student_id: string } => Boolean(link.student_id))
    .map((link) => ({
    id: link.id,
    student: studentMap.get(link.student_id) || null,
    }));

  return (
    <>
      <ParentCommunicationDock parentId={user.id} links={communicationLinks} />
      {children}
    </>
  );
}
