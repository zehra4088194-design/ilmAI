import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, FileBarChart2, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function summarizeStudy(rows: any[]) {
  return {
    sessions: rows.length,
    minutes: rows.reduce((sum, row) => sum + Math.max(0, Number(row.duration) || 0), 0),
    xp: rows.reduce((sum, row) => sum + Math.max(0, Number(row.xp_earned) || 0), 0),
  };
}

function summarizeQuizzes(rows: any[]) {
  const completed = rows.filter((row) => row.status === 'COMPLETED');
  const scoreRows = completed.filter((row) => Number.isFinite(Number(row.score)));
  return {
    completed: completed.length,
    average: scoreRows.length
      ? Math.round(scoreRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / scoreRows.length)
      : null,
  };
}

export default async function ParentReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ studentId?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fparent%2Freports');

  const params = await searchParams;
  const requestedStudentId = params?.studentId || '';
  let linksQuery = supabase
    .from('parent_student_links')
    .select('id, student_id, profiles!parent_student_links_student_id_fkey(id, full_name, subscription_tier)')
    .eq('parent_id', user.id)
    .eq('status', 'approved');
  if (requestedStudentId) linksQuery = linksQuery.eq('student_id', requestedStudentId);
  const { data: links } = await linksQuery.order('linked_at', { ascending: false });
  if (!links?.length) redirect('/parent');

  const settings = await getPlatformSettings();
  const students = links
    .map((link: any) => {
      const student = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
      const tier: SubscriptionTier = student?.subscription_tier === 'PRO' || student?.subscription_tier === 'ELITE' ? student.subscription_tier : 'FREE';
      const plan = getPlanFromSettings(settings, tier);
      return { linkId: link.id, student, tier, reportsEnabled: plan.access.parentReports };
    })
    .filter((item) => item.student?.id);

  const reportStart = addDays(new Date(), -31);
  const studentIds = students.map((item) => item.student.id);
  const [{ data: studyRows }, { data: quizRows }, { data: weeklyRows }] = await Promise.all([
    supabase
      .from('study_sessions')
      .select('user_id, date, duration, xp_earned')
      .in('user_id', studentIds)
      .gte('date', isoDate(reportStart))
      .order('date', { ascending: false }),
    supabase
      .from('quiz_sessions')
      .select('user_id, status, score, completed_at')
      .in('user_id', studentIds)
      .gte('completed_at', reportStart.toISOString())
      .order('completed_at', { ascending: false }),
    supabase
      .from('parent_weekly_reports' as any)
      .select('id, student_id, week_start_date, summary, ai_narrative, suggested_actions')
      .eq('parent_id', user.id)
      .in('student_id', studentIds)
      .order('week_start_date', { ascending: false })
      .limit(24),
  ]);

  const today = new Date();
  const weekStart = startOfWeek(today);
  const previousWeekStart = addDays(weekStart, -7);
  const monthStart = startOfMonth(today);
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm"><Link href="/parent"><ArrowLeft className="h-4 w-4" />Parent dashboard</Link></Button>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold"><FileBarChart2 className="h-6 w-6 text-violet-400" />Daily, Weekly & Monthly Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">Har linked child ke study activity aur quiz records se family report.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {students.map(({ student, reportsEnabled }) => {
          const study = ((studyRows || []) as any[]).filter((row) => row.user_id === student.id);
          const quizzes = ((quizRows || []) as any[]).filter((row) => row.user_id === student.id);
          const currentWeekStudy = study.filter((row) => row.date >= isoDate(weekStart));
          const previousWeekStudy = study.filter((row) => row.date >= isoDate(previousWeekStart) && row.date < isoDate(weekStart));
          const currentMonthStudy = study.filter((row) => row.date >= isoDate(monthStart));
          const previousMonthStudy = study.filter((row) => row.date >= isoDate(previousMonthStart) && row.date < isoDate(monthStart));
          const currentWeekQuiz = quizzes.filter((row) => row.completed_at && row.completed_at >= weekStart.toISOString());
          const currentMonthQuiz = quizzes.filter((row) => row.completed_at && row.completed_at >= monthStart.toISOString());
          const dayKey = isoDate(today);
          const todayStudy = study.filter((row) => row.date === dayKey);
          const todaySummary = summarizeStudy(todayStudy);
          const weekSummary = summarizeStudy(currentWeekStudy);
          const prevWeekSummary = summarizeStudy(previousWeekStudy);
          const monthSummary = summarizeStudy(currentMonthStudy);
          const prevMonthSummary = summarizeStudy(previousMonthStudy);
          const weekQuizzes = summarizeQuizzes(currentWeekQuiz);
          const monthQuizzes = summarizeQuizzes(currentMonthQuiz);

          return (
            <Card key={student.id} className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="truncate text-base">{student.full_name}</CardTitle>
                  <Badge variant={reportsEnabled ? 'default' : 'outline'}>{reportsEnabled ? 'Reports' : 'Locked'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!reportsEnabled ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
                    Detailed parent reports are available on a paid student plan.
                    <Button asChild variant="gradient" size="sm" className="mt-3 w-full"><Link href="/subscription">View plans</Link></Button>
                  </div>
                ) : (
                  <>
                    <section className="rounded-xl border p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4 text-violet-400" />Today</div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <Metric value={`${todaySummary.minutes}m`} label="Study" />
                        <Metric value={todaySummary.sessions} label="Sessions" />
                        <Metric value={todaySummary.xp} label="XP" />
                      </div>
                    </section>

                    <section className="rounded-xl border p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-sky-400" />This week</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Metric value={`${weekSummary.minutes}m`} label="Study time" />
                        <Metric value={weekQuizzes.completed} label="Quizzes" />
                        <Metric value={weekQuizzes.average === null ? '—' : `${weekQuizzes.average}%`} label="Avg score" />
                        <Metric value={`${weekSummary.xp} XP`} label="XP earned" />
                      </div>
                      <p className="text-muted-foreground mt-2 text-[11px]">Previous week: {prevWeekSummary.minutes}m study · {prevWeekSummary.xp} XP</p>
                    </section>

                    <section className="rounded-xl border p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Trophy className="h-4 w-4 text-amber-500" />This month</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Metric value={`${monthSummary.minutes}m`} label="Study time" />
                        <Metric value={monthQuizzes.completed} label="Quizzes" />
                        <Metric value={monthQuizzes.average === null ? '—' : `${monthQuizzes.average}%`} label="Avg score" />
                        <Metric value={`${monthSummary.xp} XP`} label="XP earned" />
                      </div>
                      <p className="text-muted-foreground mt-2 text-[11px]">Previous month: {prevMonthSummary.minutes}m study · {prevMonthSummary.xp} XP</p>
                    </section>

                    <div className="rounded-xl bg-muted/30 p-3 text-xs">
                      <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Report history</div>
                      {((weeklyRows || []) as any[]).filter((row) => row.student_id === student.id).slice(0, 4).map((row) => (
                        <div key={row.id} className="mt-2 rounded-lg border bg-background p-2">
                          <p className="text-muted-foreground">Week of {row.week_start_date}</p>
                          {row.ai_narrative && <p className="mt-1 text-sm">{row.ai_narrative}</p>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-2">
      <p className="font-bold">{value}</p>
      <p className="text-muted-foreground mt-0.5 text-[10px]">{label}</p>
    </div>
  );
}
