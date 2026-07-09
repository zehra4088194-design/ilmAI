import Link from 'next/link';
import { Brain, CalendarCheck, Flame, Star, Target, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type SubjectScore = { subjectId: string | null; subjectName: string; average: number; attempts: number };

export function StudyCommandCenter({
  streak,
  subjects,
  scores,
}: {
  streak: number;
  subjects: { id: string; name: string }[];
  scores: SubjectScore[];
}) {
  const weakSubject = scores.length ? [...scores].sort((a, b) => a.average - b.average)[0] : null;
  const focus = weakSubject?.subjectName || subjects[0]?.name || 'AI Tutor warm-up';
  const nextAction = weakSubject ? 'Practice weak concepts with AI Testing' : 'Start your first subject practice';

  return (
    <Card className="overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-card to-cyan-500/5">
      <CardContent className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-300">
              <Target className="h-4 w-4" />
              Study Command Center
            </div>
            <h2 className="text-xl font-bold">Today&apos;s focus: {focus}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{nextAction}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric icon={Flame} label="Streak" value={`${streak} days`} />
            <Metric icon={CalendarCheck} label="Weak area" value={weakSubject ? `${weakSubject.average}%` : 'New'} />
            <Metric icon={Star} label="Subjects" value={String(subjects.length || 0)} />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="gradient"><Link href="/ai-tutor"><Brain className="h-4 w-4" /> AI Tutor</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/practice"><Zap className="h-4 w-4" /> AI Testing</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/flashcards">Flashcards</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/guess-paper">Guess Paper</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-3">
      <Icon className="mb-2 h-4 w-4 text-violet-400" />
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
