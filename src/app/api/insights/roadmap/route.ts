import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { gatewayChat } from '@/lib/ai/gateway';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import {
  checkAiToolLimit,
  consumeAiCredits,
  getAiCreditCost,
  getConfiguredLimitExceededMessage,
} from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 45;

type InsightType = 'daily_plan' | 'weekly_plan' | 'monthly_roadmap';

type RoadmapTask = {
  label: string;
  subject_id: string | null;
  chapter_id: string | null;
  duration_minutes: number;
  reason: string;
};

type Roadmap = {
  title: string;
  summary: string;
  tasks: RoadmapTask[];
  checkpoints: string[];
  risk_flags: string[];
};

const VALIDITY_DAYS: Record<InsightType, number> = {
  daily_plan: 1,
  weekly_plan: 7,
  monthly_roadmap: 30,
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isInsightType(value: unknown): value is InsightType {
  return value === 'daily_plan' || value === 'weekly_plan' || value === 'monthly_roadmap';
}

function weakConceptList(weaknesses: Record<string, number> = {}) {
  return Object.entries(weaknesses)
    .sort((a, b) => a[1] - b[1])
    .map(([key, confidence]) => {
      const [subjectId, chapterId] = key.split(':');
      return { subjectId, chapterId, confidence: Number(confidence) };
    });
}

function cleanText(value: unknown, fallback: string, maxLength = 240) {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return value.trim().slice(0, maxLength);
}

function normalizeRoadmap(
  value: unknown,
  fallback: Roadmap,
  allowedSubjectIds: Set<string>,
  allowedChapterIds: Set<string>
): Roadmap {
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as Record<string, unknown>;
  const tasks = Array.isArray(raw.tasks)
    ? raw.tasks
        .slice(0, 7)
        .map((task): RoadmapTask | null => {
          if (!task || typeof task !== 'object') return null;
          const item = task as Record<string, unknown>;
          const label = cleanText(item.label, '', 120);
          if (!label) return null;
          const subjectId =
            typeof item.subject_id === 'string' && allowedSubjectIds.has(item.subject_id) ? item.subject_id : null;
          const chapterId =
            typeof item.chapter_id === 'string' && allowedChapterIds.has(item.chapter_id) ? item.chapter_id : null;
          const duration = Number(item.duration_minutes);
          return {
            label,
            subject_id: subjectId,
            chapter_id: chapterId,
            duration_minutes: Number.isFinite(duration) ? Math.min(120, Math.max(10, Math.round(duration))) : 30,
            reason: cleanText(item.reason, 'Supports your current study priority.', 180),
          };
        })
        .filter((task): task is RoadmapTask => task !== null)
    : [];

  const checkpoints = Array.isArray(raw.checkpoints)
    ? raw.checkpoints
        .map((checkpoint) => cleanText(checkpoint, '', 160))
        .filter(Boolean)
        .slice(0, 5)
    : fallback.checkpoints;
  const riskFlags = Array.isArray(raw.risk_flags)
    ? raw.risk_flags
        .map((flag) => cleanText(flag, '', 160))
        .filter(Boolean)
        .slice(0, 4)
    : [];

  return {
    title: cleanText(raw.title, fallback.title, 80),
    summary: cleanText(raw.summary, fallback.summary, 260),
    tasks: tasks.length ? tasks : fallback.tasks,
    checkpoints,
    risk_flags: riskFlags,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    const service = createServiceClient() as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedInsightType: unknown = body.insight_type;
    const insightType: InsightType = isInsightType(requestedInsightType) ? requestedInsightType : 'weekly_plan';
    const force = body.force === true;
    const now = new Date().toISOString();

    const [{ data: profile }, { data: twin, error: twinError }, { data: cached }] = await Promise.all([
      supabase.from('profiles').select('subscription_tier, board, grade_level').eq('id', user.id).single(),
      db
        .from('student_digital_twin')
        .select(
          'weaknesses, strengths, confidence_level, preferred_study_time, avg_solve_speed_seconds, attention_span_minutes'
        )
        .eq('student_id', user.id)
        .maybeSingle(),
      db
        .from('ai_insight_cache')
        .select('content, generated_at, valid_until')
        .eq('student_id', user.id)
        .eq('insight_type', insightType)
        .gt('valid_until', now)
        .maybeSingle(),
    ]);

    const tier = ((profile as any)?.subscription_tier || 'FREE') as SubscriptionTier;
    if (!force && cached?.content) {
      return NextResponse.json({
        status: 'success',
        data: {
          tier,
          cached: true,
          insight: cached.content,
          generated_at: cached.generated_at,
          valid_until: cached.valid_until,
          credit_cost: 0,
        },
      });
    }

    if (twinError) {
      return NextResponse.json({ status: 'error', error: 'Learning signals are unavailable.' }, { status: 500 });
    }

    const typedTwin = (twin || {}) as {
      weaknesses?: Record<string, number>;
      strengths?: Record<string, number>;
      confidence_level?: number;
      preferred_study_time?: string | null;
      avg_solve_speed_seconds?: number | null;
      attention_span_minutes?: number | null;
    };

    const [
      { data: recentStudy },
      { data: recentQuizzes },
      { data: recentMistakes },
      { data: dueRevisions },
      { data: masteryRows },
    ] = await Promise.all([
      supabase
        .from('study_sessions')
        .select('type, duration, date, subject_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('quiz_sessions')
        .select(
          'score, correct_count, incorrect_count, skipped_count, time_spent, completed_at, subject_id, chapter_ids'
        )
        .eq('user_id', user.id)
        .eq('status', 'COMPLETED')
        .order('completed_at', { ascending: false })
        .limit(12),
      db
        .from('student_mistakes')
        .select('chapter_id, subject_id, source, status, created_at')
        .eq('student_id', user.id)
        .in('status', ['needs_revision', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(30),
      db
        .from('student_revision_items')
        .select('title, due_at, chapter_id, subject_id')
        .eq('student_id', user.id)
        .eq('status', 'due')
        .order('due_at', { ascending: true })
        .limit(12),
      db
        .from('chapter_mastery')
        .select('chapter_id, mastery, attempts, incorrect_count, status')
        .eq('student_id', user.id)
        .order('mastery', { ascending: true })
        .limit(20),
    ]);

    const weakConcepts = weakConceptList(typedTwin.weaknesses);
    const knownWeakChapters = new Set(weakConcepts.map((item) => item.chapterId).filter(Boolean));
    for (const row of masteryRows || []) {
      if (!row.chapter_id || knownWeakChapters.has(row.chapter_id)) continue;
      weakConcepts.push({
        subjectId: '',
        chapterId: row.chapter_id,
        confidence: Number(row.mastery || 0),
      });
    }
    weakConcepts.sort((a, b) => a.confidence - b.confidence);

    const chapterIds = [
      ...new Set(
        [
          ...weakConcepts.map((item) => item.chapterId),
          ...(recentMistakes || []).map((item: any) => item.chapter_id),
          ...(dueRevisions || []).map((item: any) => item.chapter_id),
          ...(recentQuizzes || []).flatMap((item) => item.chapter_ids || []),
        ].filter((id): id is string => !!id && uuidPattern.test(id))
      ),
    ];
    const { data: chapters } = chapterIds.length
      ? await supabase.from('chapters').select('id, name, subject_id').in('id', chapterIds)
      : { data: [] };
    const chapterNames = new Map((chapters || []).map((chapter) => [chapter.id, chapter.name]));
    const chapterSubjects = new Map((chapters || []).map((chapter) => [chapter.id, chapter.subject_id]));
    const subjectIds = [
      ...new Set(
        [
          ...weakConcepts.map((item) => item.subjectId),
          ...(recentMistakes || []).map((item: any) => item.subject_id),
          ...(dueRevisions || []).map((item: any) => item.subject_id),
          ...(recentQuizzes || []).map((item) => item.subject_id),
          ...(chapters || []).map((chapter) => chapter.subject_id),
        ].filter((id): id is string => !!id && uuidPattern.test(id))
      ),
    ];
    const { data: subjects } = subjectIds.length
      ? await supabase.from('subjects').select('id, name').in('id', subjectIds)
      : { data: [] };
    const subjectNames = new Map((subjects || []).map((subject) => [subject.id, subject.name]));

    const namedWeakConcepts = weakConcepts.slice(0, 8).map((item) => {
      const subjectId = item.subjectId || chapterSubjects.get(item.chapterId || '') || null;
      return {
        subject_id: subjectId,
        subject: subjectNames.get(subjectId || '') || 'Subject',
        chapter_id: item.chapterId || null,
        chapter: chapterNames.get(item.chapterId || '') || 'Chapter',
        confidence: Math.round(item.confidence),
      };
    });
    const namedMistakes = (recentMistakes || []).slice(0, 12).map((item: any) => ({
      subject: subjectNames.get(item.subject_id || chapterSubjects.get(item.chapter_id) || '') || 'Subject',
      chapter: chapterNames.get(item.chapter_id || '') || 'Chapter',
      source: item.source || 'practice',
      status: item.status,
    }));
    const namedRevisions = (dueRevisions || []).slice(0, 8).map((item: any) => ({
      title: cleanText(item.title, 'Revision task', 100),
      due_at: item.due_at,
      subject_id: item.subject_id || chapterSubjects.get(item.chapter_id) || null,
      subject: subjectNames.get(item.subject_id || chapterSubjects.get(item.chapter_id) || '') || 'Subject',
      chapter_id: item.chapter_id || null,
      chapter: chapterNames.get(item.chapter_id || '') || 'Chapter',
    }));

    const hasLearningSignals =
      namedWeakConcepts.length > 0 ||
      (recentStudy || []).length > 0 ||
      (recentQuizzes || []).length > 0 ||
      namedMistakes.length > 0 ||
      namedRevisions.length > 0;
    if (!hasLearningSignals) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Complete a practice quiz or study session before building a roadmap.',
        },
        { status: 400 }
      );
    }

    const creditCost = getAiCreditCost('insights_roadmap');
    const creditLimit = await checkAiToolLimit(user.id, tier, 'insights_roadmap');
    if (!creditLimit.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: await getConfiguredLimitExceededMessage(tier, 'AI roadmap'),
          data: { credit_cost: creditCost, remaining_credits: creditLimit.remaining },
        },
        { status: 429 }
      );
    }

    const fallbackTasks: RoadmapTask[] = [
      ...namedRevisions
        .slice(0, 2)
        .map((item: { title: string; subject_id: string | null; chapter_id: string | null; chapter: string }) => ({
          label: item.title,
          subject_id: item.subject_id,
          chapter_id: item.chapter_id,
          duration_minutes: 20,
          reason: `This revision is due${item.chapter !== 'Chapter' ? ` for ${item.chapter}` : ''}.`,
        })),
      ...namedWeakConcepts.slice(0, 5).map((item) => ({
        label: `Revise ${item.chapter} and attempt focused questions`,
        subject_id: item.subject_id,
        chapter_id: item.chapter_id,
        duration_minutes: 30,
        reason: `Current confidence is ${item.confidence}%.`,
      })),
    ].slice(0, 6);
    if (!fallbackTasks.length) {
      fallbackTasks.push({
        label: 'Review recent quiz mistakes and test recall',
        subject_id: null,
        chapter_id: null,
        duration_minutes: 30,
        reason: 'This reinforces your latest saved learning signals.',
      });
    }
    const fallback: Roadmap = {
      title: 'Focused weekly roadmap',
      summary: 'Clear due revisions first, then strengthen the weakest chapters with focused practice.',
      tasks: fallbackTasks,
      checkpoints: ['Complete one focused quiz after revision', 'Review progress at the end of the week'],
      risk_flags: [],
    };

    const roadmapProvider = await resolveAiRoutingProvider('studyTools');
    const result = await gatewayChat({
      provider: roadmapProvider,
      strictProvider: true,
      routingPolicy: 'text',
      tier: tier === 'ELITE' ? 'medium' : 'mini',
      messages: [
        {
          role: 'system',
          content:
            'Create compact, supportive study roadmaps from learner evidence. Do not make high-stakes predictions. Return only valid JSON, without markdown fences.',
        },
        {
          role: 'user',
          content: `Build a ${insightType} for this Pakistani board student.
Board: ${(profile as any)?.board || 'unknown'}
Grade: ${(profile as any)?.grade_level || 'unknown'}
Confidence: ${typedTwin.confidence_level ?? 'unknown'}
Preferred study time: ${typedTwin.preferred_study_time || 'unknown'}
Attention span (minutes): ${typedTwin.attention_span_minutes ?? 'unknown'}
Average solve speed (seconds): ${typedTwin.avg_solve_speed_seconds ?? 'unknown'}

Weak chapters:
${JSON.stringify(namedWeakConcepts)}
Active mistake patterns:
${JSON.stringify(namedMistakes)}
Due revisions:
${JSON.stringify(namedRevisions)}
Recent quizzes:
${JSON.stringify(recentQuizzes || [])}
Recent study:
${JSON.stringify(recentStudy || [])}

Prioritize due work and low-confidence chapters. Use only the supplied subject_id and chapter_id values.
Return JSON:
{
  "title": "short title",
  "summary": "one sentence",
  "tasks": [
    {"label":"specific task", "subject_id":"supplied uuid or null", "chapter_id":"supplied uuid or null", "duration_minutes":30, "reason":"evidence-based reason"}
  ],
  "checkpoints": ["specific measurable checkpoint"],
  "risk_flags": ["neutral study risk, if any"]
}`,
        },
      ],
      maxTokens: 1800,
      temperature: 0.3,
    });

    const parsed = parseAiJson<unknown>(result.text, fallback);
    const content = normalizeRoadmap(parsed, fallback, new Set(subjectIds), new Set(chapterIds));
    const generatedAt = new Date().toISOString();
    const validUntil = new Date(Date.now() + VALIDITY_DAYS[insightType] * 24 * 60 * 60 * 1000).toISOString();

    const { error: cacheError } = await service.from('ai_insight_cache').upsert(
      {
        student_id: user.id,
        insight_type: insightType,
        content,
        generated_at: generatedAt,
        valid_until: validUntil,
      },
      { onConflict: 'student_id,insight_type' }
    );
    if (cacheError) console.error('Roadmap cache write failed:', cacheError);

    const charged = await consumeAiCredits(user.id, tier, 'insights_roadmap');
    return NextResponse.json({
      status: 'success',
      data: {
        tier,
        cached: false,
        insight: content,
        generated_at: generatedAt,
        valid_until: validUntil,
        credit_cost: creditCost,
        remaining_credits: charged.remaining,
      },
    });
  } catch (error) {
    console.error('Roadmap insight error:', error);
    return NextResponse.json({ status: 'error', error: 'The roadmap could not be generated.' }, { status: 500 });
  }
}
