import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { gatewayChat } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';

export const runtime = 'nodejs';
export const maxDuration = 45;

type InsightType = 'daily_plan' | 'weekly_plan' | 'monthly_roadmap';

const VALIDITY_DAYS: Record<InsightType, number> = {
  daily_plan: 1,
  weekly_plan: 7,
  monthly_roadmap: 30,
};

function isInsightType(value: unknown): value is InsightType {
  return value === 'daily_plan' || value === 'weekly_plan' || value === 'monthly_roadmap';
}

function weakConceptList(weaknesses: Record<string, number> = {}) {
  return Object.entries(weaknesses)
    .sort((a, b) => a[1] - b[1])
    .map(([key, confidence]) => {
      const [subjectId, chapterId] = key.split(':');
      return { subjectId, chapterId, confidence };
    });
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

    const { insight_type: requestedType } = await req.json();
    const insightType = isInsightType(requestedType) ? requestedType : 'weekly_plan';

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, board, grade_level')
      .eq('id', user.id)
      .single();

    const { data: twin, error: twinError } = await db
      .from('student_digital_twin')
      .select('weaknesses, strengths, confidence_level, preferred_study_time, avg_solve_speed_seconds, attention_span_minutes')
      .eq('student_id', user.id)
      .maybeSingle();

    if (twinError) {
      return NextResponse.json({ status: 'error', error: 'Digital twin unavailable' }, { status: 500 });
    }

    const typedTwin = (twin || {}) as {
      weaknesses?: Record<string, number>;
      strengths?: Record<string, number>;
      confidence_level?: number;
      preferred_study_time?: string | null;
      avg_solve_speed_seconds?: number | null;
      attention_span_minutes?: number | null;
    };

    const tier = profile?.subscription_tier || 'FREE';
    if (tier === 'FREE') {
      return NextResponse.json({
        status: 'success',
        data: {
          tier,
          locked: true,
          weakConcepts: weakConceptList(typedTwin.weaknesses),
        },
      });
    }

    const { data: cached } = await db
      .from('ai_insight_cache')
      .select('content, generated_at, valid_until')
      .eq('student_id', user.id)
      .eq('insight_type', insightType)
      .gt('valid_until', new Date().toISOString())
      .maybeSingle();

    if (cached?.content) {
      return NextResponse.json({ status: 'success', data: { tier, cached: true, insight: cached.content } });
    }

    const { data: recentStudy } = await supabase
      .from('study_sessions')
      .select('type, duration, xp_earned, date')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12);

    const result = await gatewayChat({
      provider: 'groq',
      tier: tier === 'ELITE' ? 'medium' : 'mini',
      messages: [
        {
          role: 'system',
          content: 'You create compact study roadmaps from learner analytics. Return only valid JSON, no markdown fences.',
        },
        {
          role: 'user',
          content: `Build a ${insightType} for this Pakistani board student.
Board: ${profile?.board || 'unknown'}
Grade: ${profile?.grade_level || 'unknown'}
Weaknesses are keyed as subject_id:chapter_id with confidence 0-100; lower is weaker.
Digital twin:
${JSON.stringify(typedTwin)}
Recent study sessions:
${JSON.stringify(recentStudy || [])}

Return JSON:
{
  "title": "short title",
  "summary": "one sentence",
  "tasks": [
    {"label":"task", "subject_id":"uuid or null", "chapter_id":"uuid or null", "duration_minutes":30, "reason":"short reason"}
  ],
  "checkpoints": ["..."],
  "risk_flags": ["..."]
}`,
        },
      ],
      maxTokens: 2200,
      temperature: 0.35,
    });

    const fallback = {
      title: 'Focused roadmap',
      summary: 'Revise the weakest chapters first, then test recall.',
      tasks: weakConceptList(typedTwin.weaknesses).slice(0, 5).map((item) => ({
        label: 'Revise weak concept and attempt focused MCQs',
        subject_id: item.subjectId,
        chapter_id: item.chapterId,
        duration_minutes: 30,
        reason: `Confidence is ${item.confidence}%`,
      })),
      checkpoints: ['Complete one focused quiz after revision'],
      risk_flags: [],
    };
    const content = parseAiJson(result.text, fallback);
    const validUntil = new Date(Date.now() + VALIDITY_DAYS[insightType] * 24 * 60 * 60 * 1000).toISOString();

    await service.from('ai_insight_cache').upsert(
      {
        student_id: user.id,
        insight_type: insightType,
        content,
        generated_at: new Date().toISOString(),
        valid_until: validUntil,
      },
      { onConflict: 'student_id,insight_type' }
    );

    return NextResponse.json({ status: 'success', data: { tier, cached: false, insight: content } });
  } catch (error) {
    console.error('Roadmap insight error:', error);
    return NextResponse.json({ status: 'error', error: 'Roadmap generate nahi ho saka' }, { status: 500 });
  }
}
