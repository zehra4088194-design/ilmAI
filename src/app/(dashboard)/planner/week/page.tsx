import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Sparkles, Target } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { addDaysIso, pakistanDateIso } from '@/lib/dates/pakistan';

export const metadata: Metadata = { title: 'Weekly Planner' };

export default async function WeekPlannerPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const supabase = await createClient();
  const db = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  const { session: highlightedSessionId } = await searchParams;
  const today = pakistanDateIso();
  const dates = Array.from({ length: 7 }, (_, index) => addDaysIso(today, index));
  const { data: sessions } = await db
    .from('study_plan_sessions')
    .select('id, session_date, session_type, duration_minutes, is_completed, subjects(name), chapters(name)')
    .eq('student_id', user!.id)
    .gte('session_date', dates[0])
    .lte('session_date', dates[6])
    .order('session_date', { ascending: true });

  const sessionsByDate = new Map<string, any[]>();
  for (const session of sessions || []) {
    const list = sessionsByDate.get(session.session_date) || [];
    list.push(session);
    sessionsByDate.set(session.session_date, list);
  }

  const allSessions = sessions || [];
  const completedCount = allSessions.filter((item: any) => item.is_completed).length;
  const plannedMinutes = allSessions.reduce((sum: number, item: any) => sum + Number(item.duration_minutes || 0), 0);
  const completedMinutes = allSessions.filter((item: any) => item.is_completed).reduce((sum: number, item: any) => sum + Number(item.duration_minutes || 0), 0);
  const completion = allSessions.length ? Math.round((completedCount / allSessions.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-500"><CalendarDays className="h-4 w-4" /> 7-day command view</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">Your week at a glance</h1>
          <p className="text-muted-foreground mt-1 text-sm">See the load before you start, then jump straight into today.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/planner/today">Today</Link></Button>
          <Button asChild variant="gradient"><Link href="/planner/setup"><Sparkles className="h-4 w-4" /> New smart plan</Link></Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Target} label="Week progress" value={`${completion}%`} sub={`${completedCount}/${allSessions.length || 0} sessions`} />
        <Metric icon={Clock3} label="Planned time" value={`${Math.floor(plannedMinutes / 60)}h ${plannedMinutes % 60}m`} sub={`${completedMinutes} min completed`} />
        <Metric icon={CheckCircle2} label="Status" value={completion >= 70 ? 'On track' : completion > 0 ? 'In motion' : 'Ready'} sub="Based on this week's plan" />
      </div>

      <div className="glass rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between text-sm"><span className="font-semibold">Weekly completion</span><span className="text-muted-foreground">{completion}%</span></div>
        <Progress value={completion} className="mt-3 h-3" />
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{completedMinutes} min complete</span><span>{Math.max(0, plannedMinutes - completedMinutes)} min remaining</span></div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {dates.map((date, dayIndex) => {
          const daySessions = sessionsByDate.get(date) || [];
          const dayDone = daySessions.filter((item: any) => item.is_completed).length;
          const dayPercent = daySessions.length ? Math.round((dayDone / daySessions.length) * 100) : 0;
          return (
            <div key={date} className={`glass min-h-60 rounded-2xl p-3 transition ${dayIndex === 0 ? 'ring-1 ring-violet-500/20' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-violet-500">{dayIndex === 0 ? 'TODAY' : `DAY ${dayIndex + 1}`}</p>
                  <p className="mt-1 font-bold">{new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                </div>
                <span className="text-muted-foreground text-[11px]">{dayPercent}%</span>
              </div>
              <Progress value={dayPercent} className="mt-3 h-1.5" />
              <div className="mt-3 space-y-2">
                {daySessions.length ? daySessions.map((session: any) => (
                  <div id={`session-${session.id}`} key={session.id} className={`rounded-xl border p-2.5 ${session.id === highlightedSessionId ? 'border-violet-500 bg-violet-500/10' : session.is_completed ? 'border-emerald-500/20 bg-emerald-500/5' : 'bg-muted/15'}`}>
                    <div className="flex items-start gap-2"><div className="mt-0.5 shrink-0">{session.is_completed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Clock3 className="h-3.5 w-3.5 text-violet-500" />}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{session.chapters?.name || session.subjects?.name || 'Study block'}</p><p className="text-muted-foreground mt-1 text-[11px] capitalize">{session.session_type.replace('_', ' ')} · {session.duration_minutes}m</p></div></div>
                  </div>
                )) : <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">Recovery day / no planned session</div>}
              </div>
              {daySessions.length > 0 && dayIndex === 0 && <Link href={`/planner/today?session=${daySessions.find((item: any) => !item.is_completed)?.id || daySessions[0].id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-500 hover:underline">Open today's route <ArrowRight className="h-3.5 w-3.5" /></Link>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub }: { icon: typeof Target; label: string; value: string; sub: string }) {
  return <div className="glass rounded-2xl p-4"><div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Icon className="h-4 w-4 text-violet-500" />{label}</div><p className="mt-2 text-xl font-bold">{value}</p><p className="text-muted-foreground mt-1 text-xs">{sub}</p></div>;
}
