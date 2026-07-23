import Link from 'next/link';
import { BookOpen, Brain, CalendarCheck, ClipboardCheck, FileText, Flame, Gamepad2, Music2, Star, Target, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type SubjectScore = { subjectId: string | null; subjectName: string; average: number; attempts: number };
type MissionState = {
  diagnosticDone?: boolean;
  weakChapter?: { id: string; name: string; mastery: number; status?: string | null } | null;
  revisionDue?: number;
};

export function StudyCommandCenter({
  streak,
  subjects,
  scores,
  mission,
}: {
  streak: number;
  subjects: { id: string; name: string }[];
  scores: SubjectScore[];
  mission?: MissionState;
}) {
  const weakSubject = scores.length ? [...scores].sort((a, b) => a.average - b.average)[0] : null;
  const focus = mission?.weakChapter?.name || weakSubject?.subjectName || subjects[0]?.name || 'AI Tutor warm-up';
  const nextAction = !mission?.diagnosticDone
    ? 'Start the diagnostic test to build your mastery map.'
    : mission?.revisionDue
      ? `${mission.revisionDue} revision item${mission.revisionDue === 1 ? '' : 's'} due from previous mistakes.`
      : weakSubject
        ? 'Practice weak concepts with AI Testing.'
        : 'Start your first subject practice.';
  const missionSteps = [
    { label: 'Diagnostic', href: '/diagnostic', icon: ClipboardCheck, active: !mission?.diagnosticDone },
    { label: 'Weak Chapters', href: '/insights', icon: Target, active: Boolean(mission?.weakChapter) },
    { label: 'Learn', href: '/library', icon: BookOpen, active: false },
    { label: 'Practice', href: '/practice', icon: Zap, active: false },
    { label: 'Revision', href: '/planner/today', icon: CalendarCheck, active: Boolean(mission?.revisionDue) },
    { label: 'Mock Exam', href: '/full-test', icon: FileText, active: false },
  ];

  return (
    <Card className="dashboard-surface overflow-hidden border-violet-500/25 text-foreground">
      <CardContent className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-300">
              <Target className="h-4 w-4" />
              Today&apos;s Mission
            </div>
            <h2 className="text-xl font-bold">Focus: {focus}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{nextAction}</p>
            {mission?.weakChapter && (
              <p className="mt-2 text-xs font-semibold text-amber-500">
                Weak chapter status: {mission.weakChapter.status || 'needs_revision'} ({Math.round(mission.weakChapter.mastery)}%)
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric icon={Flame} label="Streak" value={`${streak} days`} />
            <Metric icon={CalendarCheck} label="Weak area" value={weakSubject ? `${weakSubject.average}%` : 'New'} />
            <Metric icon={Star} label="Subjects" value={String(subjects.length || 0)} />
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {missionSteps.map(({ label, href, icon: Icon, active }) => (
            <Link
              key={label}
              href={href}
              className={`rounded-2xl border p-3 text-sm transition hover:-translate-y-0.5 hover:border-primary/50 ${
                active ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border/70 bg-background/55'
              }`}
            >
              <Icon className="mb-2 h-4 w-4" />
              <span className="font-semibold">{label}</span>
            </Link>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="gradient"><Link href="/ai-tutor"><Brain className="h-4 w-4" /> AI Tutor</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/practice"><Zap className="h-4 w-4" /> AI Testing</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/flashcards">Flashcards</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/guess-paper">Guess Paper</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/rest"><Music2 className="h-4 w-4" /> Rest</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/games"><Gamepad2 className="h-4 w-4" /> Games</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="dashboard-surface rounded-xl border border-border/70 p-3 shadow-sm">
      <Icon className="mb-2 h-4 w-4 text-violet-400" />
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
