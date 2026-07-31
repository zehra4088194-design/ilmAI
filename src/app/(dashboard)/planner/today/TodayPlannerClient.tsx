'use client';

import { useEffect, useOptimistic, useTransition } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { completePlannerSession } from '../actions';

export type PlannerSessionItem = {
  id: string;
  session_type: string;
  duration_minutes: number;
  is_completed: boolean;
  subjects?: { name: string } | null;
  chapters?: { name: string } | null;
};

export function TodayPlannerClient({
  sessions,
  highlightedSessionId,
}: {
  sessions: PlannerSessionItem[];
  highlightedSessionId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [optimisticSessions, markOptimistic] = useOptimistic(sessions, (current, sessionId: string) =>
    current.map((item) => (item.id === sessionId ? { ...item, is_completed: true } : item))
  );

  useEffect(() => {
    if (!highlightedSessionId) return;
    document.getElementById(`session-${highlightedSessionId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [highlightedSessionId]);

  const complete = (sessionId: string) => {
    markOptimistic(sessionId);
    startTransition(async () => {
      const result = await completePlannerSession(sessionId);
      if (result.status === 'success') toast.success('Session completed');
      else toast.error(result.error || 'Session update failed');
    });
  };

  return (
    <div className="space-y-3">
      {optimisticSessions.map((session) => (
        <div
          id={`session-${session.id}`}
          key={session.id}
          className={`glass flex scroll-mt-24 items-center justify-between gap-3 rounded-xl p-4 transition ${
            session.id === highlightedSessionId ? 'ring-offset-background ring-2 ring-violet-500 ring-offset-2' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            {session.is_completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Circle className="text-muted-foreground h-5 w-5" />
            )}
            <div>
              <p className="font-semibold">{session.chapters?.name || session.subjects?.name || 'Study block'}</p>
              <p className="text-muted-foreground text-sm capitalize">
                {session.session_type.replace('_', ' ')} · {session.duration_minutes} min
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={session.is_completed ? 'secondary' : 'gradient'}
            disabled={session.is_completed || pending}
            onClick={() => complete(session.id)}
          >
            {pending && !session.is_completed ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {session.is_completed ? 'Done' : 'Complete'}
          </Button>
        </div>
      ))}
    </div>
  );
}
