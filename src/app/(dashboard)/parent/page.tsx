import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ParentDashboardClient } from '@/components/features/parent/ParentDashboardClient';

export const metadata: Metadata = { title: 'Parent Dashboard' };

export default async function ParentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: parentProfile } = await supabase
    .from('profiles')
    .select('role, subscription_tier')
    .eq('id', user.id)
    .single();

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
  let reports: any[] = [];
  let predictions: any[] = [];
  if (approvedStudentIds.length > 0) {
    const [{ data }, { data: reportRows }, { data: predictionRows }] = await Promise.all([
      supabase
      .from('student_weekly_snapshots')
      .select('*')
      .in('student_id', approvedStudentIds)
      .gte('week_start', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .order('week_start', { ascending: false }),
      supabase
        .from('parent_weekly_reports' as any)
        .select('*')
        .in('student_id', approvedStudentIds)
        .order('week_start_date', { ascending: false })
        .limit(6),
      supabase
        .from('student_predictions' as any)
        .select('student_id, dropout_risk_score, burnout_risk_score, computed_at')
        .in('student_id', approvedStudentIds)
        .order('computed_at', { ascending: false }),
    ]);
    snapshots = data || [];
    reports = reportRows || [];
    predictions = predictionRows || [];
  }
  const predictionByStudent = new Map(predictions.map((prediction) => [prediction.student_id, prediction]));
  const parentTier = parentProfile?.subscription_tier || 'FREE';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Parent Dashboard</h1>
        <p className="text-muted-foreground">Linked students ki progress, chat aur routine schedule yahin manage hota hai.</p>
      </div>
      <ParentDashboardClient links={links || []} snapshots={snapshots} parentId={user.id} />
      {reports.length > 0 && (
        <section className="glass rounded-xl p-5">
          <h2 className="mb-3 font-bold">Weekly Reports</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {reports.map((report) => (
              <div key={report.id} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{report.week_start_date}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <span className="rounded bg-muted p-2">XP {report.summary?.xp_earned ?? report.summary?.xp_gained ?? 0}</span>
                  <span className="rounded bg-muted p-2">Quizzes {report.summary?.quizzes_completed ?? report.summary?.quizzes_taken ?? 0}</span>
                  <span className="rounded bg-muted p-2">Study {report.summary?.study_minutes ?? 0}m</span>
                </div>
                {parentTier === 'FREE' ? (
                  <p className="mt-3 text-sm text-muted-foreground">Upgrade to Pro for AI narrative and suggested parent actions.</p>
                ) : (
                  <>
                    <p className="mt-3 text-sm">{report.ai_narrative}</p>
                    <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                      {(report.suggested_actions || []).map((action: string) => <li key={action}>{action}</li>)}
                    </ul>
                  </>
                )}
                {parentTier === 'ELITE' && predictionByStudent.get(report.student_id) && (
                  <div className="mt-3 rounded-lg border border-violet-500/30 p-2 text-xs">
                    <p>Dropout risk: {Math.round(predictionByStudent.get(report.student_id).dropout_risk_score || 0)}%</p>
                    <p>Burnout risk: {Math.round(predictionByStudent.get(report.student_id).burnout_risk_score || 0)}%</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
