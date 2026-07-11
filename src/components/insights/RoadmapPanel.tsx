'use client';

import { useEffect, useState } from 'react';
import { Loader2, Lock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type RoadmapTask = {
  label?: string;
  duration_minutes?: number;
  reason?: string;
};

type Roadmap = {
  title?: string;
  summary?: string;
  tasks?: RoadmapTask[];
  checkpoints?: string[];
  risk_flags?: string[];
};

export function RoadmapPanel({
  tier,
  initialInsight,
}: {
  tier: string;
  initialInsight?: Roadmap | null;
}) {
  const [insight, setInsight] = useState<Roadmap | null>(initialInsight || null);
  const [loading, setLoading] = useState(!initialInsight && tier !== 'FREE');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tier === 'FREE' || initialInsight) return;
    let active = true;
    setLoading(true);
    fetch('/api/insights/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insight_type: 'weekly_plan' }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (json.status === 'success') setInsight(json.data?.insight || null);
        else setError(json.error || 'Roadmap unavailable');
      })
      .catch(() => active && setError('Roadmap unavailable'))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [initialInsight, tier]);

  if (tier === 'FREE') {
    return (
      <div className="relative overflow-hidden rounded-xl border border-border/60">
        <div className="space-y-3 p-5 blur-[2px]">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-16 rounded bg-muted/70" />
          <div className="h-16 rounded bg-muted/70" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/75 p-5 text-center backdrop-blur-sm">
          <Lock className="mb-2 h-5 w-5 text-violet-400" />
          <p className="font-semibold">AI roadmap is unlocked on Pro and Elite</p>
          <p className="mt-1 text-sm text-muted-foreground">Free includes weak-concept detection without the generated plan.</p>
          <Button asChild variant="gradient" className="mt-4">
            <Link href="/subscription">Upgrade</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-violet-400" />
        Building your roadmap...
      </div>
    );
  }

  if (error || !insight) {
    return <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">{error || 'No roadmap yet.'}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-violet-400">
          <Sparkles className="h-4 w-4" />
          {insight.title || 'Weekly roadmap'}
        </p>
        {insight.summary && <p className="mt-1 text-sm text-muted-foreground">{insight.summary}</p>}
      </div>
      <div className="space-y-3">
        {(insight.tasks || []).map((task, index) => (
          <div key={`${task.label}-${index}`} className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{task.label || 'Study task'}</p>
              {task.duration_minutes ? <span className="shrink-0 text-xs text-muted-foreground">{task.duration_minutes} min</span> : null}
            </div>
            {task.reason && <p className="mt-1 text-xs text-muted-foreground">{task.reason}</p>}
          </div>
        ))}
      </div>
      {insight.checkpoints?.length ? (
        <div className="rounded-lg border border-border/60 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Checkpoints</p>
          <div className="space-y-1 text-sm">
            {insight.checkpoints.map((checkpoint) => <p key={checkpoint}>{checkpoint}</p>)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
