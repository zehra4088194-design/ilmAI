import Link from 'next/link';
import { CalendarClock, CheckCircle2, FileText, Star, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function RevisionPlannerCard({
  board,
  gradeLevel,
  focusSubject,
}: {
  board?: string | null;
  gradeLevel?: string | null;
  focusSubject?: string;
}) {
  const tasks = [
    `Revise ${focusSubject || 'one priority subject'} for 25 minutes`,
    'Attempt 10 AI-generated MCQs',
    'Create or review 5 flashcards',
    'Mark one weak concept for AI Tutor follow-up',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><CalendarClock className="h-5 w-5 text-violet-400" />AI Revision Planner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">
          {board || 'Board not set'} · {gradeLevel || 'Class not set'}
        </div>
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <span>{task}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <MiniAction icon={Zap} label="MCQs" />
          <MiniAction icon={Star} label="Flashcards" />
          <MiniAction icon={FileText} label="Past Paper" />
        </div>
        <Button asChild variant="gradient" className="w-full"><Link href="/routine">Start today&apos;s plan</Link></Button>
      </CardContent>
    </Card>
  );
}

function MiniAction({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="rounded-lg border bg-background/70 p-2">
      <Icon className="mx-auto mb-1 h-4 w-4 text-violet-400" />
      {label}
    </div>
  );
}
