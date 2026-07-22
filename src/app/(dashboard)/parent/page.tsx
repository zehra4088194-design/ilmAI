import { Metadata } from 'next';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ParentDashboardClient } from '@/components/features/parent/ParentDashboardClient';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import { aiDecisionFeaturesEnabled } from '@/lib/compliance/ai-decision-features';
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
  let parentInsights: Record<string, any[]> = {};
  const showAiDecisionFeatures = aiDecisionFeaturesEnabled();
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
    const predictionQuery = showAiDecisionFeatures && advancedStudentIds.length
      ? (await createAdminClient())
          .from('student_predictions' as any)
          .select('student_id, dropout_risk_score, burnout_risk_score, computed_at')
          .in('student_id', advancedStudentIds)
          .order('computed_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] });
    const dueCutoff = new Date().toISOString();
    const [
      { data },
      { data: reportRows },
      { data: predictionRows },
      { data: masteryRows },
      { data: revisionRows },
    ] = await Promise.all([
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
      supabase
        .from('chapter_mastery' as any)
        .select('student_id, mastery, status, chapters(name, subjects(name))')
        .in('student_id', dashboardStudentIds)
        .in('status', ['needs_revision', 'learning'])
        .order('mastery', { ascending: true })
        .limit(30),
      supabase
        .from('student_revision_items' as any)
        .select('student_id, id')
        .in('student_id', dashboardStudentIds)
        .eq('status', 'due')
        .lte('due_at', dueCutoff)
        .limit(200),
    ]);
    snapshots = data || [];
    reports = reportRows || [];
    predictions = predictionRows || [];
    const dueRevisionCount = new Map<string, number>();
    for (const row of (revisionRows || []) as any[]) {
      dueRevisionCount.set(row.student_id, (dueRevisionCount.get(row.student_id) || 0) + 1);
    }
    const weakByStudent = new Map<string, any>();
    for (const row of (masteryRows || []) as any[]) {
      if (!weakByStudent.has(row.student_id)) weakByStudent.set(row.student_id, row);
    }
    parentInsights = Object.fromEntries(
      dashboardStudentIds.map((studentId) => {
        const studentSnapshots = (data || [])
          .filter((snapshot) => snapshot.student_id === studentId)
          .slice(0, 2);
        const latest = studentSnapshots[0];
        const previous = studentSnapshots[1];
        const weak = weakByStudent.get(studentId);
        const insights = [];
        if (weak) {
          insights.push({
            type: 'weak_chapter',
            title: `${weak.chapters?.subjects?.name || 'Subject'} needs attention`,
            body: `${weak.chapters?.name || 'A chapter'} is at ${Math.round(Number(weak.mastery) || 0)}% mastery.`,
            action: 'Assign 15 minutes of practice today.',
          });
        }
        const dueCount = dueRevisionCount.get(studentId) || 0;
        if (dueCount > 0) {
          insights.push({
            type: 'revision_due',
            title: `${dueCount} revision item${dueCount === 1 ? '' : 's'} due`,
            body: 'These are based on previous mistakes and spaced repetition.',
            action: 'Ask the student to complete revision before new practice.',
          });
        }
        if (latest && previous && Number(latest.study_minutes || 0) < Number(previous.study_minutes || 0) * 0.75) {
          insights.push({
            type: 'study_drop',
            title: 'Study time dropped',
            body: `This week is ${Math.round(Number(latest.study_minutes || 0))} minutes vs ${Math.round(Number(previous.study_minutes || 0))} minutes last week.`,
            action: 'Set one small daily study target instead of a long session.',
          });
        }
        if (!insights.length) {
          insights.push({
            type: 'steady',
            title: 'No urgent study item detected',
            body: 'Current activity looks stable from the available records.',
            action: 'Keep the daily mission active and review weak chapters weekly.',
          });
        }
        return [studentId, insights.slice(0, 3)];
      })
    );
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
        insights={parentInsights}
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
                {showAiDecisionFeatures && predictionByStudent.get(report.student_id) && (
                  <div className="mt-3 rounded-lg border border-violet-500/30 p-2 text-xs">
                    <p>
                      Study continuity signal: {Math.round(predictionByStudent.get(report.student_id).dropout_risk_score || 0)}%
                    </p>
                    <p>
                      Study load signal: {Math.round(predictionByStudent.get(report.student_id).burnout_risk_score || 0)}%
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
