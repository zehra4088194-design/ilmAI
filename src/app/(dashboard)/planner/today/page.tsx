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
  const { data: { user } } = await supabase.auth.getUser();
  const {
    session: highlightedSessionId,
    autoRevision,
    subjectId,
    examDate,
    autoRevisionReady,
    autoRevisionFailed,
  } = await searchParams;

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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-violet-500">Personal study command center</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">Own your day.</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm md:text-base">Your next action, study load and focus timer — all in one place.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/planner/week">Week view</Link></Button>
          <Button asChild variant="gradient"><Link href="/planner/setup"><Sparkles className="h-4 w-4" /> Plan smarter</Link></Button>
        </div>
      </div>
      {autoRevisionReady && <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"><Sparkles className="h-4 w-4 shrink-0" />A focused revision plan was added using your study signals.</div>}
      {autoRevisionFailed && <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"><TriangleAlert className="h-4 w-4 shrink-0" />The revision plan could not be generated. Open Planner Setup to try again.</div>}
      {sessions?.length ? <TodayPlannerClient sessions={sessions as unknown as PlannerSessionItem[]} highlightedSessionId={highlightedSessionId} /> : <div className="glass rounded-3xl p-8 text-center"><CalendarPlus className="mx-auto mb-3 h-9 w-9 text-violet-400" /><p className="text-lg font-semibold">Your day is wide open.</p><p className="text-muted-foreground mt-1 text-sm">Build a smart plan and ilm AI will turn it into focused study sessions.</p><Button asChild variant="gradient" className="mt-5"><Link href="/planner/setup"><Sparkles className="h-4 w-4" /> Build my study plan</Link></Button></div>}
    </div>
  );
}
