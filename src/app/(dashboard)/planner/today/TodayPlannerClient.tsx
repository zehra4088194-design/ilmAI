'use client';

import { useEffect, useMemo, useOptimistic, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Brain,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Flame,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  TimerReset,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { completePlannerSession } from '../actions';

export type PlannerSessionItem = {
  id: string;
  session_type: string;
  duration_minutes: number;
  is_completed: boolean;
  subjects?: { name: string } | null;
  chapters?: { name: string } | null;
};

const typeMeta: Record<string, { label: string; icon: typeof Brain; chip: string }> = {
  study: { label: 'Study', icon: Brain, chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-300' },
  revision: { label: 'Revision', icon: RotateCcw, chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-300' },
  mock_test: { label: 'Mock test', icon: Target, chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-300' },
  break: { label: 'Break', icon: Clock3, chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
};

export function TodayPlannerClient({ sessions, highlightedSessionId }: { sessions: PlannerSessionItem[]; highlightedSessionId?: string }) {
  const [pending, startTransition] = useTransition();
  const [optimisticSessions, markOptimistic] = useOptimistic(sessions, (current, sessionId: string) =>
    current.map((item) => (item.id === sessionId ? { ...item, is_completed: true } : item))
  );
  const [focusId, setFocusId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const completed = optimisticSessions.filter((item) => item.is_completed).length;
  const plannedMinutes = optimisticSessions.reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);
  const completedMinutes = optimisticSessions.filter((item) => item.is_completed).reduce((sum, item) => sum + Number(item.duration_minutes || 0), 0);
  const progress = optimisticSessions.length ? Math.round((completed / optimisticSessions.length) * 100) : 0;
  const nextSession = optimisticSessions.find((item) => !item.is_completed);
  const focusSession = optimisticSessions.find((item) => item.id === focusId);

  useEffect(() => {
    if (!highlightedSessionId) return;
    document.getElementById(`session-${highlightedSessionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedSessionId]);

  useEffect(() => {
    if (!focusId || secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [focusId, secondsLeft]);

  useEffect(() => {
    if (focusId && secondsLeft === 0) {
      toast.success('Focus session finished. Mark it complete when you are done.');
    }
  }, [focusId, secondsLeft]);

  const startFocus = (session: PlannerSessionItem) => {
    setFocusId(session.id);
    setSecondsLeft(Math.max(5, Math.round(Number(session.duration_minutes || 25) * 60)));
    document.getElementById(`session-${session.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const complete = (sessionId: string) => {
    markOptimistic(sessionId);
    startTransition(async () => {
      const result = await completePlannerSession(sessionId);
      if (result.status === 'success') toast.success(`Session complete · +${result.xpEarned ?? 0} XP`);
      else toast.error(result.error || 'Session update failed');
    });
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const focusProgress = focusSession && focusSession.duration_minutes > 0
    ? Math.max(0, Math.min(100, ((focusSession.duration_minutes * 60 - secondsLeft) / (focusSession.duration_minutes * 60)) * 100))
    : 0;

  const grouped = useMemo(() => {
    const order = ['study', 'revision', 'mock_test', 'break'];
    return [...optimisticSessions].sort((a, b) => order.indexOf(a.session_type) - order.indexOf(b.session_type));
  }, [optimisticSessions]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Target} label="Today progress" value={`${progress}%`} detail={`${completed}/${optimisticSessions.length || 0} sessions`} />
        <StatCard icon={Clock3} label="Study planned" value={`${Math.floor(plannedMinutes / 60)}h ${plannedMinutes % 60}m`} detail={`${completedMinutes} min completed`} />
        <StatCard icon={Flame} label="Keep the momentum" value={progress >= 70 ? 'Strong' : progress > 0 ? 'Building' : 'Ready'} detail="Finish the next block" />
        <StatCard icon={Sparkles} label="Next move" value={nextSession ? shortTitle(nextSession) : 'All done'} detail={nextSession ? `${nextSession.duration_minutes} min` : 'Great work today'} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/15 via-background to-sky-500/10 p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-500"><Brain className="h-4 w-4" /> AI Study Command Center</div>
            <h2 className="mt-2 text-xl font-bold md:text-2xl">{nextSession ? `Focus on ${shortTitle(nextSession)}` : 'Your plan is complete'}</h2>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">One clear next action, less scrolling, and a focused session timer so the planner feels like a study cockpit rather than a calendar.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {nextSession && !nextSession.is_completed && <Button variant="gradient" onClick={() => startFocus(nextSession)}><Play className="h-4 w-4" /> Focus now</Button>}
              <Button asChild variant="outline"><Link href="/planner/setup"><Sparkles className="h-4 w-4" /> Rebuild plan</Link></Button>
              <Button asChild variant="outline"><Link href="/planner/week">See week</Link></Button>
            </div>
          </div>
          <div className="w-full max-w-sm rounded-2xl border bg-background/60 p-4 backdrop-blur">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Day completion</span><span className="font-semibold">{progress}%</span></div>
            <Progress value={progress} className="mt-3 h-3" />
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{completedMinutes} min done</span><span>{Math.max(0, plannedMinutes - completedMinutes)} min left</span></div>
          </div>
        </div>
      </div>

      {focusSession && (
        <div className="sticky top-3 z-20 rounded-2xl border border-violet-500/30 bg-background/90 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-violet-500">Focus mode</p><p className="truncate font-bold">{shortTitle(focusSession)}</p></div>
            <div className="flex items-center gap-4"><div className="font-mono text-2xl font-bold tabular-nums">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div><Button size="sm" variant="outline" onClick={() => { setFocusId(null); setSecondsLeft(0); }}>Exit</Button></div>
          </div>
          <Progress value={focusProgress} className="mt-3 h-2" />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-violet-500">Your timeline</p><h2 className="text-xl font-bold">Today's sessions</h2></div><span className="text-muted-foreground text-xs">Tap Focus now to start a real study block</span></div>
        {grouped.map((session, index) => {
          const meta = typeMeta[session.session_type] || typeMeta.study;
          const Icon = meta.icon;
          return (
            <div id={`session-${session.id}`} key={session.id} className={`group glass scroll-mt-24 rounded-2xl p-4 transition-all duration-200 md:p-5 ${session.id === highlightedSessionId ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-background' : ''} ${session.is_completed ? 'opacity-75' : 'hover:-translate-y-0.5 hover:shadow-lg'}`}>
              <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${session.is_completed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-violet-500/10 text-violet-600'}`}>{session.is_completed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{session.chapters?.name || session.subjects?.name || 'Study block'}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}>{meta.label}</span>{index === 0 && !session.is_completed && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-300">Up next</span>}</div><div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span>{session.subjects?.name || 'General'}</span><span>•</span><span>{session.duration_minutes} min</span></div></div>
                <div className="flex shrink-0 items-center gap-2">{!session.is_completed && <Button size="sm" variant="outline" onClick={() => startFocus(session)}><Play className="h-4 w-4" /><span className="hidden sm:inline">Focus</span></Button>}<Button size="sm" variant={session.is_completed ? 'secondary' : 'gradient'} disabled={session.is_completed || pending} onClick={() => complete(session.id)}>{session.is_completed ? <><Check className="h-4 w-4" /> Done</> : 'Complete'}</Button></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof Target; label: string; value: string; detail: string }) {
  return <div className="glass rounded-2xl p-4"><div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Icon className="h-4 w-4 text-violet-500" />{label}</div><div className="mt-2 truncate text-lg font-bold">{value}</div><p className="text-muted-foreground mt-1 text-xs">{detail}</p></div>;
}

function shortTitle(session: PlannerSessionItem) {
  const title = session.chapters?.name || session.subjects?.name || 'Study block';
  return title.length > 32 ? `${title.slice(0, 29)}…` : title;
}
