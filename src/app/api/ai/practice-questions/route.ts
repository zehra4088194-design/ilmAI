import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import { generateChapterQuestionPaper } from '@/lib/tests/chapter-question-bank';
import type { SubscriptionTier } from '@/types';

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

    const { type, subjectId, chapterId, count } = await req.json();
    const questionType: PracticeType = type === 'long' ? 'long' : 'short';
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
      return NextResponse.json({ status: 'error', error: 'The daily practice limit has been reached.' }, { status: 429 });
    }

    const finalCount = cleanCount(count, questionType);
    const paper = await generateChapterQuestionPaper({
      subjectId,
      chapterId,
      mcqCount: 0,
      shortCount: questionType === 'short' ? finalCount : 0,
      longCount: questionType === 'long' ? finalCount : 0,
    });
    const questions = questionType === 'short' ? paper.shortQuestions : paper.longQuestions;
    if (!questions.length) {
      return NextResponse.json(
        { status: 'error', error: `No source-based ${questionType} questions are available for this chapter yet.` },
        { status: 409 }
      );
    }

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
