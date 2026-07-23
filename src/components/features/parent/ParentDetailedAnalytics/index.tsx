'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  BookOpenCheck,
  BrainCircuit,
  Clock3,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import type { SubscriptionTier } from '@/types';

type Subject = { id: string; name: string; color: string | null };

export function ParentDetailedAnalytics({
  linkId,
  student,
  tier,
  snapshots,
  quizzes,
  studySessions,
  routineTests,
  reports,
  subjects,
  advanced,
}: {
  linkId: string;
  student: any;
  tier: SubscriptionTier;
  snapshots: any[];
  quizzes: any[];
  studySessions: any[];
  routineTests: any[];
  reports: any[];
  subjects: Subject[];
  advanced: { prediction: any; digitalTwin: any } | null;
}) {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
  const completedScores = quizzes.map((quiz) => Number(quiz.score)).filter(Number.isFinite);
  const averageScore = completedScores.length
    ? Math.round(completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length)
    : 0;
  const correct = quizzes.reduce((sum, quiz) => sum + (Number(quiz.correct_count) || 0), 0);
  const attempted = quizzes.reduce(
    (sum, quiz) => sum + (Number(quiz.correct_count) || 0) + (Number(quiz.incorrect_count) || 0),
    0
  );
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
  const totalStudySeconds = studySessions.reduce((sum, session) => sum + (Number(session.duration) || 0), 0);

  const weeklyTrend = snapshots.map((snapshot) => ({
    label: new Date(`${snapshot.week_start}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    xp: Number(snapshot.xp_earned) || 0,
    score: Number(snapshot.average_score) || 0,
    study: Number(snapshot.study_minutes) || 0,
    quizzes: Number(snapshot.quizzes_completed) || 0,
  }));
  const bySubject = new Map<string, { scores: number[]; minutes: number }>();
  quizzes.forEach((quiz) => {
    const current = bySubject.get(quiz.subject_id) || { scores: [], minutes: 0 };
    if (Number.isFinite(Number(quiz.score))) current.scores.push(Number(quiz.score));
    bySubject.set(quiz.subject_id, current);
  });
  studySessions.forEach((session) => {
    if (!session.subject_id) return;
    const current = bySubject.get(session.subject_id) || { scores: [], minutes: 0 };
    current.minutes += (Number(session.duration) || 0) / 60;
    bySubject.set(session.subject_id, current);
  });
  const subjectBars = [...bySubject.entries()].map(([id, values]) => ({
    name: subjectMap.get(id)?.name || 'Subject',
    score: values.scores.length
      ? Math.round(values.scores.reduce((sum, score) => sum + score, 0) / values.scores.length)
      : 0,
    study: values.minutes,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-2 -ml-3"><Link href="/parent"><ArrowLeft className="h-4 w-4" />Parent dashboard</Link></Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{student.full_name}&apos;s learning record</h1>
            <Badge>{tier}</Badge>
          </div>
          <p className="text-muted-foreground mt-2">Real quiz, study-session, weekly snapshot and routine-test data.</p>
        </div>
        <Button asChild variant="outline"><Link href={`/parent?linkId=${encodeURIComponent(linkId)}`}>Open communication</Link></Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Metric icon={BookOpenCheck} label="Quizzes" value={quizzes.length} tone="text-violet-500" />
        <Metric icon={Target} label="Average" value={`${averageScore}%`} tone="text-emerald-500" />
        <Metric icon={TrendingUp} label="Accuracy" value={`${accuracy}%`} tone="text-cyan-500" />
        <Metric icon={Clock3} label="90-day study" value={`${Math.round(totalStudySeconds / 3600)}h`} tone="text-blue-500" />
        <Metric icon={Flame} label="Streak" value={`${student.streak || 0}d`} tone="text-orange-500" />
        <Metric icon={Sparkles} label="XP / Level" value={`${student.xp || 0} / ${student.level || 1}`} tone="text-amber-500" />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader><CardTitle className="text-base">12-week progress trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" name="Average score" stroke="#22c55e" strokeWidth={3} />
                  <Line type="monotone" dataKey="xp" name="XP earned" stroke="#8b5cf6" strokeWidth={3} />
                  <Line type="monotone" dataKey="study" name="Study minutes" stroke="#0ea5e9" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-base">Subject condition</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectBars} layout="vertical" margin={{ top: 8, right: 18, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={82} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="score" name="Average score" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent quiz record</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {quizzes.slice(0, 8).map((quiz) => (
              <div key={quiz.id} className="border-border/70 flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                <div className="min-w-0"><p className="truncate font-semibold">{subjectMap.get(quiz.subject_id)?.name || 'Subject'} quiz</p><p className="text-muted-foreground text-xs">{quiz.completed_at ? new Date(quiz.completed_at).toLocaleString() : 'In progress'} | {Math.round((Number(quiz.time_spent) || 0) / 60)} min</p></div>
                <Badge variant={Number(quiz.score) >= 70 ? 'success' : Number(quiz.score) >= 45 ? 'secondary' : 'destructive'}>{Math.round(Number(quiz.score) || 0)}%</Badge>
              </div>
            ))}
            {!quizzes.length && <Empty label="No completed quizzes yet." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Routine tests and follow-through</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {routineTests.map((test) => (
              <div key={test.id} className="border-border/70 flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                <div className="min-w-0"><p className="truncate font-semibold">{test.title}</p><p className="text-muted-foreground text-xs">{test.subject} | {new Date(test.scheduled_at).toLocaleString()}</p></div>
                <Badge variant={test.status === 'completed' ? 'success' : 'outline'}>{test.score == null ? test.status : `${test.score}%`}</Badge>
              </div>
            ))}
            {!routineTests.length && <Empty label="No routine tests scheduled yet." />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BrainCircuit className="h-4 w-4 text-violet-500" />Parent report</CardTitle></CardHeader>
        <CardContent>
          {reports[0] ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-xs">Week of {reports[0].week_start_date}</p>
              <p className="leading-7">{reports[0].ai_narrative || 'Cached weekly activity summary is available.'}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {(reports[0].suggested_actions || []).map((action: string) => <div key={action} className="bg-muted/35 rounded-xl p-3 text-sm">{action}</div>)}
              </div>
            </div>
          ) : <Empty label="The report will appear here after the weekly report job runs." />}
        </CardContent>
      </Card>

      {advanced ? (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-violet-500" />Elite detailed insights</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Insight label="Study score estimate" value={advanced.digitalTwin?.predicted_exam_score} suffix="%" />
            <Insight label="Confidence" value={advanced.digitalTwin?.confidence_level ?? advanced.prediction?.confidence_score} suffix="%" />
            <Insight label="Practice estimate" value={advanced.prediction?.predicted_entry_test_score} suffix="%" />
            <Insight label="Study load signal" value={advanced.prediction?.burnout_risk_score} suffix="%" warning />
            <div className="bg-background/70 rounded-xl p-3 sm:col-span-2"><p className="text-muted-foreground text-xs">Learning style</p><p className="mt-1 font-semibold">{advanced.digitalTwin?.learning_style || 'Collecting signals'}</p></div>
            <div className="bg-background/70 rounded-xl p-3 sm:col-span-2"><p className="text-muted-foreground text-xs">Preferred study time</p><p className="mt-1 font-semibold">{advanced.digitalTwin?.preferred_study_time || 'Collecting signals'}</p></div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Detailed activity insights</p><p className="text-muted-foreground mt-1 text-sm">Elite includes richer factual progress records, reports, and study history views.</p></div><Button asChild variant="outline"><Link href="/subscription/elite">View Elite</Link></Button></CardContent></Card>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Activity; label: string; value: string | number; tone: string }) {
  return <Card><CardContent className="p-4"><Icon className={cn('mb-2 h-5 w-5', tone)} /><p className="text-xl font-bold sm:text-2xl">{value}</p><p className="text-muted-foreground mt-1 text-xs">{label}</p></CardContent></Card>;
}

function Insight({ label, value, suffix = '', warning = false }: { label: string; value: unknown; suffix?: string; warning?: boolean }) {
  const formatted = Number.isFinite(Number(value)) ? `${Math.round(Number(value))}${suffix}` : 'Collecting';
  return <div className="bg-background/70 rounded-xl p-3"><p className="text-muted-foreground text-xs">{label}</p><p className={cn('mt-1 text-xl font-bold', warning && Number(value) > 60 ? 'text-amber-500' : 'text-foreground')}>{formatted}</p></div>;
}

function Empty({ label }: { label: string }) {
  return <div className="text-muted-foreground flex min-h-24 items-center justify-center text-center text-sm">{label}</div>;
}
