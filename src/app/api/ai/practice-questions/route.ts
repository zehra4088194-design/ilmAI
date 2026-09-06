import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAiMessageLimit, consumeAiCredits } from '@/lib/rate-limit';
import { generateChapterQuestionPaper } from '@/lib/tests/chapter-question-bank';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

type PracticeType = 'short' | 'long' | 'letter' | 'vocab' | 'grammar' | 'numerical';

function cleanCount(value: unknown, type: PracticeType) {
  const defaults: Record<PracticeType, { fallback: number; max: number }> = {
    short: { fallback: 5, max: 15 },
    long: { fallback: 3, max: 8 },
    letter: { fallback: 2, max: 10 },
    vocab: { fallback: 5, max: 20 },
    grammar: { fallback: 5, max: 15 },
    numerical: { fallback: 5, max: 15 },
  };
  const { fallback, max } = defaults[type];
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

    const { type, subjectId, chapterId, count } = await req.json();
    const VALID_TYPES: PracticeType[] = ['short', 'long', 'letter', 'vocab', 'grammar', 'numerical'];
    const questionType: PracticeType = VALID_TYPES.includes(type) ? type : 'short';
    if (!subjectId || !chapterId) {
      return NextResponse.json({ status: 'error', error: 'A subject and chapter are required.' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();
    const tier = ((profile as any)?.subscription_tier || 'FREE') as SubscriptionTier;
    const limitCheck = await checkAiMessageLimit(user.id, tier, 'practice_questions');
    if (!limitCheck.success) {
      return NextResponse.json(
        { status: 'error', error: 'The daily practice limit has been reached.' },
        { status: 429 }
      );
    }

    const finalCount = cleanCount(count, questionType);
    const counts = { mcqCount: 0, shortCount: 0, longCount: 0, letterCount: 0, vocabCount: 0, grammarCount: 0, numericalCount: 0 };
    const countKey = `${questionType}Count` as keyof typeof counts;
    counts[countKey] = finalCount;
    const paper = await generateChapterQuestionPaper({ subjectId, chapterId, ...counts });
    const questionsByType: Record<PracticeType, any[]> = {
      short: paper.shortQuestions,
      long: paper.longQuestions,
      letter: paper.letterQuestions,
      vocab: paper.vocabQuestions,
      grammar: paper.grammarQuestions,
      numerical: paper.numericalQuestions,
    };
    const questions = questionsByType[questionType];
    if (!questions.length) {
      return NextResponse.json(
        { status: 'error', error: `No source-based ${questionType} questions are available for this chapter yet.` },
        { status: 409 }
      );
    }

    await consumeAiCredits(user.id, tier, 'practice_questions');
    return NextResponse.json({
      status: 'success',
      data: {
        type: questionType,
        subject: paper.subject,
        chapter: paper.chapter,
        questions: questions.map((question, index) => ({
          ...question,
          id: `${Date.now()}-${index}`,
        })),
      },
    });
  } catch (error) {
    console.error('Practice questions error:', error);
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Questions could not be generated.' },
      { status: 500 }
    );
  }
}
