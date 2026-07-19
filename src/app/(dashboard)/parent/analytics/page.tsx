import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ParentDetailedAnalytics } from '@/components/features/parent/ParentDetailedAnalytics';
import type { SubscriptionTier } from '@/types';

export const metadata: Metadata = { title: 'Parent Analytics' };

export default async function ParentAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fparent%2Fanalytics');

  const requestedStudentId = (await searchParams).studentId;
  let linksQuery = supabase
    .from('parent_student_links')
    .select('id, student_id')
    .eq('parent_id', user.id)
    .eq('status', 'approved');
  if (requestedStudentId) linksQuery = linksQuery.eq('student_id', requestedStudentId);
  const { data: links } = await linksQuery.limit(1);
  const link = links?.[0];
  if (!link?.student_id) redirect('/parent');

  const { data: student } = await supabase
    .from('profiles')
    .select(
      'id, full_name, avatar_url, board, grade_level, subscription_tier, xp, level, streak, total_study_time, total_marks_percentage, target_marks_percentage'
    )
    .eq('id', link.student_id)
    .maybeSingle();
  if (!student) redirect('/parent');

  const tier: SubscriptionTier =
    student.subscription_tier === 'PRO' || student.subscription_tier === 'ELITE'
      ? student.subscription_tier
      : 'FREE';
  const settings = await getPlatformSettings();
  const plan = getPlanFromSettings(settings, tier);
  if (!plan.access.parentDashboard) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Button asChild variant="ghost">
          <Link href="/parent"><ArrowLeft className="h-4 w-4" />Parent dashboard</Link>
        </Button>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
            <LockKeyhole className="mb-4 h-10 w-10 text-amber-500" />
            <h1 className="text-2xl font-bold">Progress analytics locked</h1>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm">
              The parent link is active, but live records for {student.full_name} are available on the Pro or Elite plan.
            </p>
            <Button asChild variant="gradient" className="mt-5"><Link href="/subscription">View plans</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const since90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const [snapshotsResult, quizzesResult, studyResult, routineResult, reportsResult] = await Promise.all([
    supabase
      .from('student_weekly_snapshots')
      .select('week_start, xp_earned, study_minutes, quizzes_completed, average_score, ai_messages_sent')
      .eq('student_id', student.id)
      .order('week_start', { ascending: true })
      .limit(12),
    supabase
      .from('quiz_sessions')
      .select('id, subject_id, score, correct_count, incorrect_count, skipped_count, time_spent, completed_at, mode')
      .eq('user_id', student.id)
      .eq('status', 'COMPLETED')
      .order('completed_at', { ascending: false })
      .limit(100),
    supabase
      .from('study_sessions')
      .select('id, subject_id, date, duration, xp_earned, type')
      .eq('user_id', student.id)
      .gte('created_at', since90Days)
      .order('date', { ascending: true })
      .limit(500),
    supabase
      .from('routine_tests')
      .select('id, title, subject, scheduled_at, status, score')
      .eq('student_id', student.id)
      .order('scheduled_at', { ascending: false })
      .limit(12),
    plan.access.parentReports
      ? supabase
          .from('parent_weekly_reports' as any)
          .select('id, week_start_date, summary, ai_narrative, suggested_actions')
          .eq('parent_id', user.id)
          .eq('student_id', student.id)
          .order('week_start_date', { ascending: false })
          .limit(plan.access.advancedParentAnalytics ? 8 : 1)
      : Promise.resolve({ data: [] }),
  ]);

  const quizzes = quizzesResult.data || [];
  const studySessions = studyResult.data || [];
  const subjectIds = Array.from(
    new Set(
      [...quizzes.map((item) => item.subject_id), ...studySessions.map((item) => item.subject_id)].filter(
        (value): value is string => Boolean(value)
      )
    )
  );
  const { data: subjects } = subjectIds.length
    ? await supabase.from('subjects').select('id, name, color').in('id', subjectIds)
    : { data: [] as Array<{ id: string; name: string; color: string }> };

  let advanced: { prediction: any; digitalTwin: any } | null = null;
  if (plan.access.advancedParentAnalytics) {
    // The approved relationship was verified above. Service-role reads avoid
    // exposing these Elite-only records through broad parent RLS policies.
    const admin = (await createAdminClient()) as any;
    const [{ data: prediction }, { data: digitalTwin }] = await Promise.all([
      admin
        .from('student_predictions' as any)
        .select('predicted_board_marks, predicted_entry_test_score, burnout_risk_score, computed_at')
        .eq('student_id', student.id)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('student_digital_twin' as any)
        .select('confidence_level, learning_style, preferred_study_time, strengths, weaknesses, predicted_exam_score')
        .eq('student_id', student.id)
        .maybeSingle(),
    ]);
    advanced = { prediction, digitalTwin };
  }

  return (
    <ParentDetailedAnalytics
      linkId={link.id}
      student={student}
      tier={tier}
      snapshots={snapshotsResult.data || []}
      quizzes={quizzes}
      studySessions={studySessions}
      routineTests={routineResult.data || []}
      reports={(reportsResult.data || []) as any[]}
      subjects={subjects || []}
      advanced={advanced}
    />
  );
}
