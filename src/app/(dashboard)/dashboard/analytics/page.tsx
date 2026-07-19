import { Metadata } from 'next';
import { RoleAnalyticsClient } from '@/components/features/analytics/RoleAnalyticsClient';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Student Analytics' };

export default async function StudentAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: snapshots }, { data: quizzes }] = await Promise.all([
    supabase.from('profiles').select('xp, streak, subscription_tier, total_study_time').eq('id', user!.id).single(),
    supabase
      .from('student_weekly_snapshots')
      .select('week_start, study_minutes, average_score, quizzes_completed')
      .eq('student_id', user!.id)
      .order('week_start', { ascending: true })
      .limit(8),
    supabase
      .from('quiz_sessions')
      .select('subject_id, score')
      .eq('user_id', user!.id)
      .eq('status', 'COMPLETED')
      .not('score', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(100),
  ]);
  const p = profile as any;
  const weekly = (snapshots || []) as Array<{ week_start: string; study_minutes: number | null; average_score: number | null; quizzes_completed: number | null }>;
  const completedQuizzes = (quizzes || []) as Array<{ subject_id: string | null; score: number | null }>;
  const averageScore = completedQuizzes.length
    ? Math.round(completedQuizzes.reduce((sum, quiz) => sum + Number(quiz.score || 0), 0) / completedQuizzes.length)
    : Math.round(Number(weekly.at(-1)?.average_score || 0));
  const studyMinutes = Number(p?.total_study_time || weekly.reduce((sum, item) => sum + Number(item.study_minutes || 0), 0));
  return (
    <RoleAnalyticsClient
      title="My Analytics"
      subtitle="Study trend, XP progress, streak aur subject performance ka quick view."
      cards={[
        { label: 'XP', value: p?.xp || 0, detail: 'Total learning points' },
        { label: 'Streak', value: p?.streak || 0, detail: 'Active study days' },
        { label: 'Average score', value: `${averageScore}%`, detail: `${completedQuizzes.length} completed quizzes` },
        { label: 'Study time', value: `${Math.round(studyMinutes / 60)}h`, detail: 'Recorded learning time' },
      ]}
      trend={weekly.map((item) => ({
        label: new Date(`${item.week_start}T00:00:00Z`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
        value: Number(item.study_minutes || 0),
      }))}
      bars={[
        { label: 'Quizzes', value: completedQuizzes.length },
        { label: 'Study hours', value: Math.round(studyMinutes / 60) },
        { label: 'Avg score', value: averageScore },
      ]}
      omitted={weekly.length ? [] : ['Weekly study snapshots have not been recorded yet']}
    />
  );
}
