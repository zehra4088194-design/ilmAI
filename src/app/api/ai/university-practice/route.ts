import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAiMessageLimit, consumeAiCredits } from '@/lib/rate-limit';
import { gatewayChat, type AiProviderId } from '@/lib/ai/gateway';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getAdminAiProvider } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';

// University Hub's long/short question generator. Deliberately NOT built on
// generateChapterQuestionPaper (src/lib/tests/chapter-question-bank.ts) — that
// helper is grounded in the K-12 subjects/chapters/resources tables via subjectId/
// chapterId lookups, which university_subjects doesn't participate in. University
// subjects have no stored chapter/topic breakdown, so this generates directly from
// the subject name via gatewayChat, same AI infra, no DB-grounding needed. Grading
// re-uses /api/ai/grade-answer as-is (already has zero DB coupling).
export const runtime = 'nodejs';
export const maxDuration = 60;

type PracticeType = 'short' | 'long';

function cleanCount(value: unknown, type: PracticeType) {
  const fallback = type === 'short' ? 5 : 3;
  const max = type === 'short' ? 15 : 8;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), max);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required.' }, { status: 401 });

    const { type, subjectName, programName, count } = await req.json();
    const questionType: PracticeType = type === 'long' ? 'long' : 'short';
    if (!subjectName || typeof subjectName !== 'string') {
      return NextResponse.json({ status: 'error', error: 'A subject is required.' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();
    const tier = ((profile as any)?.subscription_tier || 'FREE') as SubscriptionTier;
    const limitCheck = await checkAiMessageLimit(user.id, tier, 'practice_questions');
    if (!limitCheck.success) {
      return NextResponse.json({ status: 'error', error: 'The daily practice limit has been reached.' }, { status: 429 });
    }

    const finalCount = cleanCount(count, questionType);
    const marks = questionType === 'short' ? 3 : 10;
    const platformSettings = await getPlatformSettings();
    const adminProvider = getAdminAiProvider(platformSettings, 'studyTools');
    const providerToUse: AiProviderId = adminProvider === 'local' ? 'groq' : adminProvider;

    const result = await gatewayChat({
      provider: providerToUse,
      tier: 'medium',
      strictProvider: true,
      routingPolicy: 'text',
      temperature: 0.4,
      maxTokens: 3000,
      messages: [
        {
          role: 'system',
          content: `You write ${questionType} exam questions for a Pakistani university course, at the level expected in a professional degree program.
Return ONLY a valid JSON array (no markdown fences): [{"q":"...","marks":${marks},"keyPoints":["...","..."],"modelAnswer":"..."}]
- "q": a clear, exam-style question a student could actually be asked.
- "keyPoints": 3-5 short bullet points the answer must cover.
- "modelAnswer": a concise model answer (${questionType === 'short' ? '3-5 sentences' : '2-3 paragraphs'}) a grader can compare against.
- Never invent facts specific to a textbook edition; keep answers conceptually correct and general.`,
        },
        {
          role: 'user',
          content: `Generate ${finalCount} ${questionType} questions for the subject "${subjectName}"${programName ? ` (part of the ${programName} program)` : ''}.`,
        },
      ],
    });

    const cleaned = result.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Invalid question response.');

    await consumeAiCredits(user.id, tier, 'practice_questions');
    return NextResponse.json({
      status: 'success',
      data: {
        type: questionType,
        subject: subjectName,
        questions: parsed.map((question: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          q: String(question.q || ''),
          marks,
          keyPoints: Array.isArray(question.keyPoints) ? question.keyPoints.map(String).slice(0, 6) : [],
          modelAnswer: String(question.modelAnswer || ''),
        })),
      },
    });
  } catch (error) {
    console.error('University practice questions error:', error);
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Questions could not be generated.' },
      { status: 500 }
    );
  }
}
