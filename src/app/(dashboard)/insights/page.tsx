import { Metadata } from 'next';
import Link from 'next/link';
import { Brain, LineChart, LockKeyhole, Target, TrendingDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { WeaknessRadar, type WeaknessRadarPoint } from '@/components/insights/WeaknessRadar';
import { RoadmapPanel } from '@/components/insights/RoadmapPanel';

export const metadata: Metadata = { title: 'Insights' };

type Twin = {
  weaknesses?: Record<string, number>;
  strengths?: Record<string, number>;
  confidence_level?: number | null;
  predicted_exam_score?: number | null;
  preferred_study_time?: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function splitTwinKey(key: string) {
  const [subjectId, chapterId] = key.split(':');
  return { subjectId, chapterId };
}

function sparkline(points: number[]) {
  const values = points.length ? points : [50];
  const width = 220;
  const height = 60;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const d = values
    .map((value, index) => {
      const x = index * step;
      const y = height - (Math.min(100, Math.max(0, value)) / 100) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full overflow-visible" role="img" aria-label="Confidence trend">
      <path d={d} fill="none" stroke="hsl(var(--chart-2))" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default async function InsightsPage() {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: twinRow },
    { data: historyRows },
    { data: cachedRoadmap },
    { data: quizRows },
  ] = await Promise.all([
    supabase.from('profiles').select('subscription_tier').eq('id', user!.id).single(),
    db
      .from('student_digital_twin')
      .select('weaknesses, strengths, confidence_level, predicted_exam_score, preferred_study_time')
      .eq('student_id', user!.id)
      .maybeSingle(),
    db
      .from('student_digital_twin_history')
      .select('confidence_level, created_at')
      .eq('student_id', user!.id)
      .order('created_at', { ascending: true })
      .limit(90),
    db
      .from('ai_insight_cache')
      .select('content')
      .eq('student_id', user!.id)
      .eq('insight_type', 'weekly_plan')
      .gt('valid_until', new Date().toISOString())
      .maybeSingle(),
    supabase
      .from('quiz_sessions')
      .select('answers, questions, chapter_ids')
      .eq('user_id', user!.id)
      .eq('status', 'COMPLETED')
      .order('completed_at', { ascending: false })
      .limit(30),
  ]);

  const twin = (twinRow || {}) as Twin;
  const weaknessEntries = Object.entries(twin.weaknesses || {}).map(([key, confidence]) => ({
    ...splitTwinKey(key),
    key,
    confidence: Number(confidence),
  }));
  const subjectIds = [...new Set(weaknessEntries.map((item) => item.subjectId).filter((id): id is string => !!id && uuidPattern.test(id)))];
  const chapterIds = [...new Set(weaknessEntries.map((item) => item.chapterId).filter((id): id is string => !!id && uuidPattern.test(id)))];
  const [{ data: subjects }, { data: chapters }] = await Promise.all([
    subjectIds.length ? supabase.from('subjects').select('id, name').in('id', subjectIds) : Promise.resolve({ data: [] }),
    chapterIds.length ? supabase.from('chapters').select('id, name, subject_id').in('id', chapterIds) : Promise.resolve({ data: [] }),
  ]);
  const subjectNames = new Map((subjects || []).map((subject) => [subject.id, subject.name]));
  const chapterNames = new Map((chapters || []).map((chapter) => [chapter.id, chapter.name]));

  const weakConcepts = weaknessEntries
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      subjectName: subjectNames.get(item.subjectId || '') || 'Subject',
      chapterName: chapterNames.get(item.chapterId || '') || 'Chapter',
    }));

  const radarData: WeaknessRadarPoint[] = weakConcepts.map((item) => ({
    label: item.chapterName,
    confidence: item.confidence,
  }));

  const mistakeMap = new Map<string, number>();
  for (const row of quizRows || []) {
    const answers = (row.answers || {}) as Record<string, any>;
    for (const answer of Object.values(answers)) {
      if (!answer || answer.isCorrect !== false) continue;
      const label = answer.questionType || (answer.chapterId ? chapterNames.get(answer.chapterId) : null) || 'Chapter review';
      mistakeMap.set(label, (mistakeMap.get(label) || 0) + 1);
    }
  }
  const mistakePatterns = Array.from(mistakeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const confidence = Number(twin.confidence_level || 50);
  const predicted = Number(twin.predicted_exam_score || confidence);
  const tier = profile?.subscription_tier || 'FREE';

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-violet-400">Learning intelligence</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">AI Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your digital twin turns quiz and study signals into focused next steps.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/planner/setup">Open planner</Link>
        </Button>
      </div>

      {!twinRow && (
        <Card className="glass">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-semibold">No digital twin yet</p>
              <p className="text-sm text-muted-foreground">Complete one AI Testing session to compute your first learning profile.</p>
            </div>
            <Button asChild variant="gradient">
              <Link href="/practice">Start practice</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-violet-400" />
              Weak Concepts
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {weakConcepts.length === 0 ? (
                <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Weak chapters will appear after completed quizzes.</p>
              ) : (
                weakConcepts.map((item) => (
                  <div key={item.key} className="rounded-lg border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{item.chapterName}</p>
                        <p className="text-xs text-muted-foreground">{item.subjectName}</p>
                      </div>
                      <span className="text-sm font-semibold">{Math.round(item.confidence)}%</span>
                    </div>
                    <Progress value={item.confidence} className="h-2" />
                  </div>
                ))
              )}
            </div>
            <WeaknessRadar data={radarData} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LineChart className="h-5 w-5 text-violet-400" />
                Confidence Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sparkline((historyRows || []).map((row: any) => Number(row.confidence_level)))}
              <p className="mt-2 text-sm text-muted-foreground">Current confidence: <span className="font-semibold text-foreground">{Math.round(confidence)}%</span></p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-violet-400" />
                Predicted Score Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{Math.max(0, Math.round(predicted - 5))}-{Math.min(100, Math.round(predicted + 5))}%</p>
              <p className="mt-1 text-sm text-muted-foreground">Based on recent accuracy, solve speed, and consistency.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-violet-400" />
              Mistake Patterns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mistakePatterns.length ? mistakePatterns.map(([label, count]) => (
              <div key={label} className="flex items-center justify-between rounded-lg border bg-muted/20 p-3 text-sm">
                <span>{label}</span>
                <span className="font-semibold">{count}</span>
              </div>
            )) : <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Wrong-answer patterns will appear after saved quiz attempts.</p>}
          </CardContent>
        </Card>

        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {tier === 'FREE' ? <LockKeyhole className="h-5 w-5 text-violet-400" /> : <Brain className="h-5 w-5 text-violet-400" />}
              AI Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RoadmapPanel tier={tier} initialInsight={(cachedRoadmap?.content as any) || null} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
