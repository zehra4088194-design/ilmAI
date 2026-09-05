import { Metadata } from 'next';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ParentDashboardClient } from '@/components/features/parent/ParentDashboardClient';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings, parentChildrenCap } from '@/lib/platform-settings/shared';
import { aiDecisionFeaturesEnabled } from '@/lib/compliance/ai-decision-features';
import { getMultiChildSubjectComparison } from '@/lib/parent/comparison';
import { MultiChildComparison } from '@/components/features/parent/MultiChildComparison';
import { getFamilyErpData } from '@/lib/parent/erp-bridge';
import { getFamilyQuranData } from '@/lib/parent/quran-bridge';
import type { SubscriptionTier } from '@/types';

export const metadata: Metadata = { title: 'Ilmai Family' };

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
    // Phase 7d — AI-suggested conversation starters, generated only for children with an
    // identified weak chapter (the same signal the 'weak_chapter' insight below already uses),
    // cached 7 days per student (see getGuardianConversationStarters).
    const conversationStartersByStudent = new Map<string, string[]>();
    if (dashboardStudentIds.some((id) => weakByStudent.has(id))) {
      const { getGuardianConversationStarters } = await import('@/lib/parent/conversation-starters');
      const insightAdmin = await createAdminClient();
      await Promise.all(
        dashboardStudentIds
          .filter((id) => weakByStudent.has(id))
          .map(async (studentId) => {
            const weak = weakByStudent.get(studentId);
            const questions = await getGuardianConversationStarters(
              insightAdmin,
              studentId,
              weak.chapters?.subjects?.name || 'their studies',
              weak.chapters?.name || ''
            );
            conversationStartersByStudent.set(studentId, questions);
          })
      );
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
            conversationStarters: conversationStartersByStudent.get(studentId) || [],
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
  // Phase 7c — only meaningful for a parent with 2+ dashboard-eligible children.
  const multiChildComparison =
    dashboardStudentIds.length >= 2 ? await getMultiChildSubjectComparison(supabase, dashboardStudentIds) : null;
  const params = await searchParams;

  // The parent account's OWN plan — separate from any child's tier above (see ParentPlanSettings'
  // doc comment). Drives the upgrade banner ParentDashboardClient shows when a parent is at/near
  // their own children-link cap.
  const { data: parentOwnProfile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();
  const parentOwnTier: SubscriptionTier =
    parentOwnProfile?.subscription_tier === 'PRO' || parentOwnProfile?.subscription_tier === 'ELITE'
      ? parentOwnProfile.subscription_tier
      : 'FREE';
  const parentPlan = {
    tier: parentOwnTier,
    childrenCap: parentChildrenCap(platformSettings, parentOwnTier),
    childrenUsed: approvedStudentIds.length,
  };

  // "What did they actually do" activity feed — a paid-parent-plan feature (see
  // ParentPlanSettings), independent of any child's own tier. Recently-read files
  // (resource_reads) and today's study sessions, per dashboard-eligible child.
  let activityByStudent: Record<string, { reads: any[]; todayMinutes: number; todaySessions: any[] }> = {};
  if (parentPlan.tier !== 'FREE' && dashboardStudentIds.length > 0) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [{ data: reads }, { data: todaySessions }] = await Promise.all([
      supabase
        .from('resource_reads' as any)
        .select('user_id, resource_kind, created_at, subjects(name), chapters(name)')
        .in('user_id', dashboardStudentIds)
        .order('created_at', { ascending: false })
        .limit(60),
      supabase
        .from('study_sessions')
        .select('user_id, duration, type, subject_id, subjects(name)')
        .in('user_id', dashboardStudentIds)
        .gte('date', todayStart.toISOString().slice(0, 10)),
    ]);
    activityByStudent = Object.fromEntries(
      dashboardStudentIds.map((studentId) => {
        const studentReads = ((reads || []) as any[]).filter((row) => row.user_id === studentId).slice(0, 5);
        const studentTodaySessions = ((todaySessions || []) as any[]).filter((row) => row.user_id === studentId);
        const todayMinutes = studentTodaySessions.reduce((sum, row) => sum + (Number(row.duration) || 0), 0);
        return [studentId, { reads: studentReads, todayMinutes, todaySessions: studentTodaySessions }];
      })
    );
  }
  // Ilmai Family — Homework/Attendance bridge for children who are also school/college
  // enrolled (school_guardians / college_guardians), plus achievements and family goals.
  const admin = await createAdminClient();
  let erpData: Record<string, any> = {};
  let earnedAchievements: any[] = [];
  let allAchievements: any[] = [];
  let familyGoals: any[] = [];
  let familyQuran: Record<string, any> = {};
  if (dashboardStudentIds.length > 0) {
    const [erpResult, earnedResult, achievementsResult, goalsResult, quranResult] = await Promise.all([
      getFamilyErpData(admin, user.id, dashboardStudentIds),
      admin.from('user_achievements').select('user_id, achievement_id, earned_at').in('user_id', dashboardStudentIds),
      admin.from('achievements').select('id, name, description, icon_url').order('condition_value', { ascending: true }),
      admin
        .from('parent_family_goals' as any)
        .select('*')
        .eq('parent_id', user.id)
        .in('student_id', dashboardStudentIds)
        .order('created_at', { ascending: false }),
      getFamilyQuranData(admin, dashboardStudentIds),
    ]);
    erpData = erpResult;
    earnedAchievements = (earnedResult.data || []) as any[];
    allAchievements = (achievementsResult.data || []) as any[];
    familyGoals = (goalsResult.data || []) as any[];
    familyQuran = quranResult;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ilmai Family</h1>
        <p className="text-muted-foreground">
          Progress, homework, attendance, achievements, and communication for every linked child in one place.
        </p>
      </div>
      <ParentDashboardClient
        links={normalizedLinks}
        snapshots={snapshots}
        insights={parentInsights}
        parentId={user.id}
        parentPlan={parentPlan}
        activityByStudent={activityByStudent}
        initialLinkId={params?.linkId}
        initialView={params?.view === 'files' ? 'files' : params?.view === 'chat' ? 'chat' : undefined}
        erpData={erpData as any}
        familyQuran={familyQuran as any}
        achievements={allAchievements}
        earnedAchievements={earnedAchievements}
        familyGoals={familyGoals}
        multiChildComparison={
          multiChildComparison ? (
            <MultiChildComparison
              comparison={multiChildComparison}
              students={normalizedStudents.filter((s) => dashboardStudentIds.includes(s.id))}
            />
          ) : null
        }
        weeklyReports={reports.map((report) => ({
          ...report,
          predictionSignal: showAiDecisionFeatures ? predictionByStudent.get(report.student_id) : null,
        }))}
        showAiDecisionFeatures={showAiDecisionFeatures}
      />
    </div>
  );
}
