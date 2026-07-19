import { Metadata } from 'next';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ParentDashboardClient } from '@/components/features/parent/ParentDashboardClient';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';

export const metadata: Metadata = { title: 'Parent Dashboard' };

export default async function ParentDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ linkId?: string; view?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get all linked students with their current stats
  const { data: links } = await supabase
    .from('parent_student_links')
    .select(
      `
      id, status, invite_code, linked_at, created_at, student_id
    `
    )
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false });

  const approvedStudentIds = (links || [])
    .filter((link) => link.status === 'approved' && link.student_id)
    .map((link) => link.student_id as string);

  const { data: students } =
    approvedStudentIds.length > 0
      ? await supabase
          .from('profiles')
          .select(
            'id, full_name, avatar_url, board, grade_level, xp, level, streak, subscription_tier, total_study_time, is_profile_complete'
          )
          .in('id', approvedStudentIds)
      : { data: [] as any[] };

  const platformSettings = await getPlatformSettings();
  const normalizedStudents = (students || []).map((student) => {
    const tier: SubscriptionTier =
      student.subscription_tier === 'PRO' || student.subscription_tier === 'ELITE'
        ? student.subscription_tier
        : 'FREE';
    const plan = getPlanFromSettings(platformSettings, tier);
    return {
      ...student,
      parent_entitlement: {
        dashboard: plan.access.parentDashboard,
        reports: plan.access.parentReports,
        advancedAnalytics: plan.access.advancedParentAnalytics,
        guardiansMax: plan.limits.parentGuardiansMax,
      },
    };
  });
  const studentMap = new Map(normalizedStudents.map((student) => [student.id, student]));
  const normalizedLinks = (links || []).map((link) => ({
    ...link,
    student: link.student_id ? studentMap.get(link.student_id) || null : null,
  }));

  // Get weekly snapshots for all approved students
  let snapshots: any[] = [];
  let reports: any[] = [];
  let predictions: any[] = [];
  const dashboardStudentIds = normalizedStudents
    .filter((student) => student.parent_entitlement.dashboard)
    .map((student) => student.id);
  const reportStudentIds = normalizedStudents
    .filter((student) => student.parent_entitlement.reports)
    .map((student) => student.id);
  const advancedStudentIds = normalizedStudents
    .filter((student) => student.parent_entitlement.advancedAnalytics)
    .map((student) => student.id);
  if (dashboardStudentIds.length > 0) {
    const predictionQuery = advancedStudentIds.length
      ? (await createAdminClient())
          .from('student_predictions' as any)
          .select('student_id, dropout_risk_score, burnout_risk_score, computed_at')
          .in('student_id', advancedStudentIds)
          .order('computed_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] });
    const [{ data }, { data: reportRows }, { data: predictionRows }] = await Promise.all([
      supabase
        .from('student_weekly_snapshots')
        .select('*')
        .in('student_id', dashboardStudentIds)
        .gte('week_start', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .order('week_start', { ascending: false }),
      supabase
        .from('parent_weekly_reports' as any)
        .select('*')
        .eq('parent_id', user.id)
        .in('student_id', reportStudentIds.length ? reportStudentIds : ['00000000-0000-0000-0000-000000000000'])
        .order('week_start_date', { ascending: false })
        .limit(6),
      predictionQuery,
    ]);
    snapshots = data || [];
    reports = reportRows || [];
    predictions = predictionRows || [];
  }
  const predictionByStudent = new Map(predictions.map((prediction) => [prediction.student_id, prediction]));
  const params = await searchParams;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Parent Dashboard</h1>
        <p className="text-muted-foreground">
          Manage linked student progress, chat, and routine schedules here.
        </p>
      </div>
      <ParentDashboardClient
        links={normalizedLinks}
        snapshots={snapshots}
        parentId={user.id}
        initialLinkId={params?.linkId}
        initialView={params?.view === 'files' ? 'files' : params?.view === 'chat' ? 'chat' : undefined}
      />
      {reports.length > 0 && (
        <section className="glass rounded-xl p-5">
          <h2 className="mb-3 font-bold">Weekly Reports</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {reports.map((report) => (
              <div key={report.id} className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">{report.week_start_date}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <span className="bg-muted rounded p-2">
                    XP {report.summary?.xp_earned ?? report.summary?.xp_gained ?? 0}
                  </span>
                  <span className="bg-muted rounded p-2">
                    Quizzes {report.summary?.quizzes_completed ?? report.summary?.quizzes_taken ?? 0}
                  </span>
                  <span className="bg-muted rounded p-2">Study {report.summary?.study_minutes ?? 0}m</span>
                </div>
                {report.ai_narrative && (
                  <>
                    <p className="mt-3 text-sm">{report.ai_narrative}</p>
                    <ul className="text-muted-foreground mt-2 list-inside list-disc text-sm">
                      {(report.suggested_actions || []).map((action: string) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  </>
                )}
                {predictionByStudent.get(report.student_id) && (
                  <div className="mt-3 rounded-lg border border-violet-500/30 p-2 text-xs">
                    <p>
                      Dropout risk: {Math.round(predictionByStudent.get(report.student_id).dropout_risk_score || 0)}%
                    </p>
                    <p>
                      Burnout risk: {Math.round(predictionByStudent.get(report.student_id).burnout_risk_score || 0)}%
                    </p>
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
