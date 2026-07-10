import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ParentDashboardClient } from '@/components/features/parent/ParentDashboardClient';

export const metadata: Metadata = { title: 'Parent Dashboard' };

export default async function ParentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get all linked students with their current stats
  const { data: links } = await supabase
    .from('parent_student_links')
    .select(`
      id, status, invite_code, linked_at, created_at,
      student:profiles!parent_student_links_student_id_fkey(
        id, full_name, avatar_url, board, grade_level, xp, level, streak,
        subscription_tier, total_study_time, is_profile_complete
      )
    `)
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false });

  // Get weekly snapshots for all approved students
  const approvedStudentIds = (links || [])
    .filter(l => l.status === 'approved')
    .map(l => (l.student as any)?.id)
    .filter(Boolean);

  let snapshots: any[] = [];
  if (approvedStudentIds.length > 0) {
    const { data } = await supabase
      .from('student_weekly_snapshots')
      .select('*')
      .in('student_id', approvedStudentIds)
      .gte('week_start', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .order('week_start', { ascending: false });
    snapshots = data || [];
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Parent Dashboard</h1>
        <p className="text-muted-foreground">Linked students ki progress, chat aur routine schedule yahin manage hota hai.</p>
      </div>
      <ParentDashboardClient links={links || []} snapshots={snapshots} parentId={user.id} />
    </div>
  );
}
