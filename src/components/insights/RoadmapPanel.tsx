'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type RoadmapTask = {
  label?: string;
  subject_id?: string | null;
  chapter_id?: string | null;
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
  initialInsight,
  initialGeneratedAt,
}: {
  initialInsight?: Roadmap | null;
  initialGeneratedAt?: string | null;
}) {
  const [insight, setInsight] = useState<Roadmap | null>(initialInsight || null);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt || null);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/credits', { cache: 'no-store' })
      .then((response) => response.json())
      .then((json) => {
        if (!active || json.status !== 'success') return;
        const periodRemaining = Number(json.data?.remaining);
        const dailyRemaining = Number(json.data?.daily?.remaining);
        const available = Number.isFinite(dailyRemaining) ? Math.min(periodRemaining, dailyRemaining) : periodRemaining;
        if (Number.isFinite(available)) setRemainingCredits(Math.max(0, available));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function generateRoadmap(force: boolean) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/insights/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insight_type: 'weekly_plan', force }),
      });
      const json = await response.json();
      if (!response.ok || json.status !== 'success') {
        throw new Error(json.error || 'Roadmap unavailable');
      }

      setInsight(json.data?.insight || null);
      setGeneratedAt(json.data?.generated_at || new Date().toISOString());
      if (typeof json.data?.remaining_credits === 'number') {
        setRemainingCredits(json.data.remaining_credits);
      }
      window.dispatchEvent(new Event('ilm-ai-credits-changed'));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Roadmap unavailable');
    } finally {
      setLoading(false);
    }
  }

  if (!insight) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
        {loading ? (
          <>
            <Loader2 className="mb-3 h-5 w-5 animate-spin text-violet-400" />
            <p className="font-semibold">Building your roadmap...</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Matching your weak chapters, mistakes, and due revisions.
            </p>
          </>
        ) : (
          <>
            <Sparkles className="mb-3 h-5 w-5 text-violet-400" />
            <p className="font-semibold">Build a focused weekly roadmap</p>
            <p className="text-muted-foreground mt-1 max-w-lg text-sm">
              The plan will use your latest saved learning signals.
            </p>
            <Button
              className="mt-4"
              variant="gradient"
              disabled={remainingCredits !== null && remainingCredits < 2}
              onClick={() => generateRoadmap(false)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Build roadmap
              <span className="ml-2 text-xs opacity-80">2 credits</span>
            </Button>
            {remainingCredits !== null && remainingCredits < 2 ? (
              <p className="text-muted-foreground mt-3 text-sm">
                2 shared credits required. {remainingCredits} available.
              </p>
            ) : null}
            {error ? <p className="text-destructive mt-3 text-sm">{error}</p> : null}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-400">
            <Sparkles className="h-4 w-4" />
            {insight.title || 'Weekly roadmap'}
          </p>
          {insight.summary ? <p className="text-muted-foreground mt-1 text-sm">{insight.summary}</p> : null}
          <p className="text-muted-foreground mt-1 text-xs">
            {remainingCredits === null
              ? generatedAt
                ? 'Saved roadmap'
                : 'Weekly roadmap'
              : `${remainingCredits} shared credits remaining`}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={loading || (remainingCredits !== null && remainingCredits < 2)}
          onClick={() => generateRoadmap(true)}
          title="Refresh roadmap using the latest learning signals"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
          <span className="text-muted-foreground ml-2 text-xs">2 credits</span>
        </Button>
      </div>

      {error ? <p className="border-destructive/40 text-destructive rounded-lg border p-3 text-sm">{error}</p> : null}

      <div className="space-y-3">
        {(insight.tasks || []).map((task, index) => {
          const practiceHref =
            task.subject_id && task.chapter_id
              ? `/practice?subject=${task.subject_id}&chapter=${task.chapter_id}`
              : null;
          return (
            <div key={`${task.label}-${index}`} className="bg-muted/20 rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{task.label || 'Study task'}</p>
                  {task.reason ? <p className="text-muted-foreground mt-1 text-xs">{task.reason}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {task.duration_minutes ? (
                    <span className="text-muted-foreground text-xs">{task.duration_minutes} min</span>
                  ) : null}
                  {practiceHref ? (
                    <Button asChild size="icon" variant="ghost" title="Open focused practice">
                      <Link href={practiceHref} aria-label="Open focused practice">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {insight.checkpoints?.length ? (
        <div className="border-t pt-3">
          <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase">Checkpoints</p>
          <div className="space-y-1 text-sm">
            {insight.checkpoints.map((checkpoint) => (
              <p key={checkpoint}>{checkpoint}</p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
