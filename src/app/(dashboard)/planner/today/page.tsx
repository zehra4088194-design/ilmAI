import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarPlus, Sparkles, TriangleAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { pakistanDateIso } from '@/lib/dates/pakistan';
import { generateAutoRevisionPlan } from '../actions';
import { TodayPlannerClient, type PlannerSessionItem } from './TodayPlannerClient';

export const metadata: Metadata = { title: 'Today Planner' };

type AutoRevisionParams = {
  session?: string;
  autoRevision?: string;
  subjectId?: string;
  examDate?: string;
  autoRevisionReady?: string;
  autoRevisionFailed?: string;
};

export default async function TodayPlannerPage({ searchParams }: { searchParams: Promise<AutoRevisionParams> }) {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    session: highlightedSessionId,
    autoRevision,
    subjectId,
    examDate,
    autoRevisionReady,
    autoRevisionFailed,
  } = await searchParams;

  // Phase 4a/4b entry point: a weak-subject or exam-countdown notification link lands here with
  // ?autoRevision=weak_subject|exam_countdown&subjectId=... instead of just /practice. Generate the
  // mini plan server-side, then redirect to strip the query params so a refresh doesn't re-trigger it.
  if ((autoRevision === 'weak_subject' || autoRevision === 'exam_countdown') && subjectId) {
    const result = await generateAutoRevisionPlan({
      reason: autoRevision,
      focusSubjectIds: [subjectId],
      examDate: examDate || null,
    });
    redirect(result.status === 'success' ? '/planner/today?autoRevisionReady=1' : '/planner/today?autoRevisionFailed=1');
  }

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
      {autoRevisionReady && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <Sparkles className="h-4 w-4 shrink-0" />A focused revision plan was added to your checklist.
        </div>
      )}
      {autoRevisionFailed && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          <TriangleAlert className="h-4 w-4 shrink-0" />The revision plan could not be generated. Try Planner &gt; Create plan instead.
        </div>
      )}
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
