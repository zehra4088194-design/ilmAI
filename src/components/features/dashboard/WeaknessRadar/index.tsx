import Link from 'next/link';
import { Activity, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type SubjectScore = { subjectId: string | null; subjectName: string; average: number; attempts: number };

export function WeaknessRadar({ scores }: { scores: SubjectScore[] }) {
  const sorted = [...scores].sort((a, b) => a.average - b.average);
  const weak = sorted[0];
  const strong = sorted[sorted.length - 1];
  const avg = scores.length ? Math.round(scores.reduce((sum, item) => sum + item.average, 0) / scores.length) : 0;

  return (
    <Card className="dashboard-surface text-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5 text-violet-400" />Weakness Radar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scores.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-5 text-center">
            <p className="font-medium">No performance data yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Complete one AI Testing session and insights will appear here.</p>
            <Link href="/practice" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet-400">Start practice <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        ) : (
          <>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>Overall accuracy</span>
                <span className="font-semibold">{avg}%</span>
              </div>
              <Progress value={avg} className="h-2" />
            </div>
            <Insight icon={TrendingDown} label="Needs attention" value={weak ? `${weak.subjectName} · ${weak.average}%` : '-'} />
            <Insight icon={TrendingUp} label="Strong subject" value={strong ? `${strong.subjectName} · ${strong.average}%` : '-'} />
            <p className="text-sm text-muted-foreground">Recommended action: revise weak concepts, then attempt 10 focused MCQs.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Insight({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/35 p-3">
      <Icon className="h-4 w-4 text-violet-400" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
