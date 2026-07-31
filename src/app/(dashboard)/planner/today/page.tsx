import { Metadata } from 'next';
import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { pakistanDateIso } from '@/lib/dates/pakistan';
import { TodayPlannerClient, type PlannerSessionItem } from './TodayPlannerClient';

export const metadata: Metadata = { title: 'Today Planner' };

export default async function TodayPlannerPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { session: highlightedSessionId } = await searchParams;
  const today = pakistanDateIso();
  const { data: sessions } = await db
    .from('study_plan_sessions')
    .select('id, session_type, duration_minutes, is_completed, subjects(name), chapters(name)')
    .eq('student_id', user!.id)
    .eq('session_date', today)
    .order('created_at', { ascending: true });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-violet-400">Today</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">Study checklist</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/planner/week">Week view</Link>
        </Button>
      </div>
      {sessions?.length ? (
        <TodayPlannerClient
          sessions={sessions as unknown as PlannerSessionItem[]}
          highlightedSessionId={highlightedSessionId}
        />
      ) : (
        <div className="glass rounded-xl p-6 text-center">
          <CalendarPlus className="mx-auto mb-3 h-8 w-8 text-violet-400" />
          <p className="font-semibold">No sessions planned for today</p>
          <p className="text-muted-foreground mt-1 text-sm">Generate a plan to fill your checklist.</p>
          <Button asChild variant="gradient" className="mt-4">
            <Link href="/planner/setup">Create plan</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
