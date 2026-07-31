import { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { addDaysIso, pakistanDateIso } from '@/lib/dates/pakistan';

export const metadata: Metadata = { title: 'Weekly Planner' };

export default async function WeekPlannerPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-violet-400">Next 7 days</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">Weekly planner</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/planner/today">Today</Link>
          </Button>
          <Button asChild variant="gradient">
            <Link href="/planner/setup">New plan</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {dates.map((date) => {
          const daySessions = sessionsByDate.get(date) || [];
          return (
            <div key={date} className="glass min-h-56 rounded-xl p-3">
              <p className="text-sm font-semibold">
                {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <div className="mt-3 space-y-2">
                {daySessions.length ? (
                  daySessions.map((session) => (
                    <div
                      id={`session-${session.id}`}
                      key={session.id}
                      className={`scroll-mt-24 rounded-lg border p-2 text-xs ${
                        session.id === highlightedSessionId
                          ? 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30'
                          : session.is_completed
                            ? 'bg-green-500/10'
                            : 'bg-muted/20'
                      }`}
                    >
                      <p className="font-semibold">
                        {session.chapters?.name || session.subjects?.name || 'Study block'}
                      </p>
                      <p className="text-muted-foreground mt-1 capitalize">
                        {session.session_type.replace('_', ' ')} · {session.duration_minutes} min
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-xs">No session</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
