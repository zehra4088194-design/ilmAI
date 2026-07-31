import { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  CalendarClock,
  Clock3,
  LineChart,
  ListChecks,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { WeaknessRadar, type WeaknessRadarPoint } from '@/components/insights/WeaknessRadar';
import { RoadmapPanel } from '@/components/insights/RoadmapPanel';
import { aiDecisionFeaturesEnabled } from '@/lib/compliance/ai-decision-features';
import { buildStudyPulse } from '@/lib/insights/metrics';

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
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-16 w-full overflow-visible"
      role="img"
      aria-label="Confidence trend"
    >
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
    { data: twinRow },
    { data: historyRows },
    { data: cachedRoadmap },
    { data: quizRows },
    { data: masteryRows },
    { data: mistakeRows },
    { data: revisionRows },
    { data: studyRows },
  ] = await Promise.all([
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
      .select('content, generated_at, valid_until')
      .eq('student_id', user!.id)
      .eq('insight_type', 'weekly_plan')
      .gt('valid_until', new Date().toISOString())
      .maybeSingle(),
    supabase
      .from('quiz_sessions')
      .select(
        'answers, chapter_ids, completed_at, correct_count, incorrect_count, score, skipped_count, subject_id, time_spent'
      )
      .eq('user_id', user!.id)
      .eq('status', 'COMPLETED')
      .order('completed_at', { ascending: false })
      .limit(30),
    db
      .from('chapter_mastery')
      .select('chapter_id, mastery, attempts, last_attempt_at')
      .eq('student_id', user!.id)
      .order('mastery', { ascending: true })
      .limit(30),
    db
      .from('student_mistakes')
      .select('chapter_id, subject_id, source, status, created_at')
      .eq('student_id', user!.id)
      .in('status', ['needs_revision', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(50),
    db
      .from('student_revision_items')
      .select('id, title, due_at, chapter_id, subject_id, status')
      .eq('student_id', user!.id)
      .eq('status', 'due')
      .order('due_at', { ascending: true })
      .limit(20),
    supabase
      .from('study_sessions')
      .select('duration, date, created_at, type, subject_id')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const pulse = buildStudyPulse(quizRows || [], studyRows || [], revisionRows?.length || 0);
  const twin = (twinRow || {}) as Twin;
  const weaknessEntries = Object.entries(twin.weaknesses || {}).map(([key, confidence]) => ({
    ...splitTwinKey(key),
    key,
    confidence: Number(confidence),
  }));
  const knownChapterIds = new Set(weaknessEntries.map((item) => item.chapterId).filter(Boolean));
  for (const row of masteryRows || []) {
    if (!row.chapter_id || knownChapterIds.has(row.chapter_id)) continue;
    weaknessEntries.push({
      subjectId: '',
      chapterId: row.chapter_id,
      key: `diagnostic:${row.chapter_id}`,
      confidence: Number(row.mastery || 0),
    });
  }
  const chapterIds = [
    ...new Set(
      [
        ...weaknessEntries.map((item) => item.chapterId),
        ...(mistakeRows || []).map((item: any) => item.chapter_id),
        ...(revisionRows || []).map((item: any) => item.chapter_id),
        ...(quizRows || []).flatMap((item) => item.chapter_ids || []),
      ].filter((id): id is string => !!id && uuidPattern.test(id))
    ),
  ];
  const { data: chapters } = chapterIds.length
    ? await supabase.from('chapters').select('id, name, subject_id').in('id', chapterIds)
    : { data: [] };
  const chapterSubjects = new Map((chapters || []).map((chapter) => [chapter.id, chapter.subject_id]));
  const subjectIds = [
    ...new Set(
      [
        ...weaknessEntries.map((item) => item.subjectId),
        ...(mistakeRows || []).map((item: any) => item.subject_id),
        ...(revisionRows || []).map((item: any) => item.subject_id),
        ...(quizRows || []).map((item) => item.subject_id),
        ...(chapters || []).map((chapter) => chapter.subject_id),
      ].filter((id): id is string => !!id && uuidPattern.test(id))
    ),
  ];
  const { data: subjects } = subjectIds.length
    ? await supabase.from('subjects').select('id, name').in('id', subjectIds)
    : { data: [] };
  const subjectNames = new Map((subjects || []).map((subject) => [subject.id, subject.name]));
  const chapterNames = new Map((chapters || []).map((chapter) => [chapter.id, chapter.name]));

  const weakConcepts = weaknessEntries
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 10)
    .map((item) => {
      const subjectId = item.subjectId || chapterSubjects.get(item.chapterId || '') || '';
      return {
        ...item,
        subjectId,
        subjectName: subjectNames.get(subjectId) || 'Subject',
        chapterName: chapterNames.get(item.chapterId || '') || 'Chapter',
        practiceHref: subjectId && item.chapterId ? `/practice?subject=${subjectId}&chapter=${item.chapterId}` : null,
      };
    });

  const radarData: WeaknessRadarPoint[] = weakConcepts.map((item) => ({
    label: item.chapterName,
    confidence: item.confidence,
  }));

  const mistakeMap = new Map<string, number>();
  for (const row of mistakeRows || []) {
    const source = String(row.source || 'Practice')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const label = chapterNames.get(row.chapter_id || '') || `${source} review`;
    mistakeMap.set(label, (mistakeMap.get(label) || 0) + 1);
  }
  for (const row of quizRows || []) {
    const answers = (row.answers || {}) as Record<string, any>;
    for (const answer of Object.values(answers)) {
      if (!answer || answer.isCorrect !== false) continue;
      const label =
        answer.questionType || (answer.chapterId ? chapterNames.get(answer.chapterId) : null) || 'Chapter review';
      mistakeMap.set(label, (mistakeMap.get(label) || 0) + 1);
    }
  }
  const mistakePatterns = Array.from(mistakeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const confidence = Number(twin.confidence_level || 50);
  const showAiDecisionFeatures = aiDecisionFeaturesEnabled();
  const firstRevision = revisionRows?.[0] as
    { title?: string; due_at?: string; chapter_id?: string; subject_id?: string } | undefined;
  const nextAction = firstRevision
    ? {
        title: firstRevision.title || 'Complete your due revision',
        detail: firstRevision.due_at
          ? `Due ${new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(firstRevision.due_at))}`
          : 'Revision is ready',
        href: '/planner/today',
        label: 'Open revision',
      }
    : weakConcepts[0]?.practiceHref
      ? {
          title: `Practice ${weakConcepts[0].chapterName}`,
          detail: `${Math.round(weakConcepts[0].confidence)}% confidence in ${weakConcepts[0].subjectName}`,
          href: weakConcepts[0].practiceHref,
          label: 'Start practice',
        }
      : {
          title: 'Complete a focused quiz',
          detail: 'Your next insight will use the saved result.',
          href: '/practice',
          label: 'Start practice',
        };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-violet-400">Learning intelligence</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">AI Insights</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your digital twin turns quiz and study signals into focused next steps.
          </p>
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
              <p className="text-muted-foreground text-sm">
                Complete one AI Testing session to compute your first learning profile.
              </p>
            </div>
            <Button asChild variant="gradient">
              <Link href="/practice">Start practice</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="glass">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5 text-violet-400" />
              Study Pulse
            </CardTitle>
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-semibold">{nextAction.title}</p>
                <p className="text-muted-foreground truncate text-xs">{nextAction.detail}</p>
              </div>
              <Button asChild size="sm">
                <Link href={nextAction.href}>
                  {nextAction.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid divide-y pt-3 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <div className="px-1 py-3 sm:px-4">
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Target className="h-4 w-4" />
              Recent quiz average
            </p>
            <p className="mt-1 text-2xl font-bold">
              {pulse.recentQuizAverage === null ? '--' : `${pulse.recentQuizAverage}%`}
            </p>
          </div>
          <div className="px-1 py-3 sm:px-4">
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              {pulse.scoreTrend !== null && pulse.scoreTrend < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              Last 5 vs previous 5
            </p>
            <p className="mt-1 text-2xl font-bold">
              {pulse.scoreTrend === null ? '--' : `${pulse.scoreTrend > 0 ? '+' : ''}${pulse.scoreTrend}%`}
            </p>
          </div>
          <div className="px-1 py-3 sm:px-4">
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Clock3 className="h-4 w-4" />
              Study time this week
            </p>
            <p className="mt-1 text-2xl font-bold">{pulse.studyMinutesThisWeek} min</p>
          </div>
          <div className="px-1 py-3 sm:px-4">
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <CalendarClock className="h-4 w-4" />
              Due revisions
            </p>
            <p className="mt-1 text-2xl font-bold">{pulse.dueRevisions}</p>
          </div>
        </CardContent>
      </Card>

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
                <p className="text-muted-foreground rounded-xl border border-dashed p-5 text-sm">
                  Weak chapters will appear after completed quizzes.
                </p>
              ) : (
                weakConcepts.map((item) => (
                  <div key={item.key} className="bg-muted/20 rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{item.chapterName}</p>
                        <p className="text-muted-foreground text-xs">{item.subjectName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{Math.round(item.confidence)}%</span>
                        {item.practiceHref ? (
                          <Button asChild size="icon" variant="ghost" title={`Practice ${item.chapterName}`}>
                            <Link href={item.practiceHref} aria-label={`Practice ${item.chapterName}`}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : null}
                      </div>
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
              <p className="text-muted-foreground mt-2 text-sm">
                Current confidence: <span className="text-foreground font-semibold">{Math.round(confidence)}%</span>
              </p>
            </CardContent>
          </Card>

          {showAiDecisionFeatures ? (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-violet-400" />
                  Predicted Score Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {Math.max(0, Math.round(Number(twin.predicted_exam_score || confidence) - 5))}-
                  {Math.min(100, Math.round(Number(twin.predicted_exam_score || confidence) + 5))}%
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Based on recent accuracy, solve speed, and consistency.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-violet-400" />
                  Next Study Focus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{weakConcepts.length}</p>
                <p className="text-muted-foreground mt-1 text-sm">Chapters currently marked for focused practice.</p>
              </CardContent>
            </Card>
          )}
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
            {mistakePatterns.length ? (
              mistakePatterns.map(([label, count]) => (
                <div
                  key={label}
                  className="bg-muted/20 flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <span>{label}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground rounded-xl border border-dashed p-5 text-sm">
                Wrong-answer patterns will appear after saved quiz attempts.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-violet-400" />
              AI Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RoadmapPanel
              initialInsight={(cachedRoadmap?.content as any) || null}
              initialGeneratedAt={cachedRoadmap?.generated_at || null}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
