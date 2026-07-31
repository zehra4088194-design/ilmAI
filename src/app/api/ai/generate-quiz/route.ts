import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkQuizLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import { chapterMcqsToQuizSession, generateChapterQuestionPaper } from '@/lib/tests/chapter-question-bank';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function cleanCount(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(Math.max(Math.floor(parsed), 1), 30);
}

function cleanOptionalCount(value: unknown, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(Math.floor(parsed), 0), max);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required.' }, { status: 401 });

    const {
      subjectId,
      chapterId,
      count = 10,
      mcqCount: requestedMcqCount,
      shortCount: requestedShortCount,
      longCount: requestedLongCount,
    } = await req.json();
    if (!subjectId || !chapterId) {
      return NextResponse.json({ status: 'error', error: 'Select a subject and chapter first.' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();
    const tier = ((profile as any)?.subscription_tier || 'FREE') as SubscriptionTier;
    const limitCheck = await checkQuizLimit(user.id, tier);
    if (!limitCheck.success) {
      return NextResponse.json(
        { status: 'error', error: await getConfiguredLimitExceededMessage(tier, 'Chapter testing') },
        { status: 429 }
      );
    }

    const finalCount = requestedMcqCount === undefined ? cleanCount(count) : cleanOptionalCount(requestedMcqCount, 30);
    const shortCount = cleanOptionalCount(requestedShortCount, 15);
    const longCount = cleanOptionalCount(requestedLongCount, 8);
    if (finalCount + shortCount + longCount === 0) {
      return NextResponse.json({ status: 'error', error: 'Select at least one question type.' }, { status: 400 });
    }
    const paper = await generateChapterQuestionPaper({
      subjectId,
      chapterId,
      mcqCount: finalCount,
      shortCount,
      longCount,
    });
    const missingTypes = [
      finalCount > 0 && paper.mcqs.length < finalCount ? `MCQs (${paper.mcqs.length}/${finalCount})` : '',
      shortCount > 0 && paper.shortQuestions.length < shortCount
        ? `short questions (${paper.shortQuestions.length}/${shortCount})`
        : '',
      longCount > 0 && paper.longQuestions.length < longCount
        ? `long questions (${paper.longQuestions.length}/${longCount})`
        : '',
    ].filter(Boolean);
    if (missingTypes.length) {
      return NextResponse.json(
        {
          status: 'error',
          error: `This chapter does not have enough source-grounded ${missingTypes.join(', ')} yet.`,
        },
        { status: 409 }
      );
    }

    if (shortCount > 0 || longCount > 0) {
      const totalMarks =
        paper.mcqs.length +
        paper.shortQuestions.reduce((sum, question) => sum + question.marks, 0) +
        paper.longQuestions.reduce((sum, question) => sum + question.marks, 0);
      return NextResponse.json({
        status: 'success',
        data: {
          kind: 'mixed',
          sourceTitle: `${paper.subject.name} - ${paper.chapter.name}`,
          paper: {
            title: `${paper.subject.name} - ${paper.chapter.name}`,
            totalMarks,
            timeAllowed: Math.max(
              15,
              paper.mcqs.length + paper.shortQuestions.length * 5 + paper.longQuestions.length * 12
            ),
            mcqs: paper.mcqs,
            shortQs: paper.shortQuestions,
            longQs: paper.longQuestions,
          },
        },
      });
    }

    return NextResponse.json({
      status: 'success',
      data: {
        kind: 'mcq',
        session: chapterMcqsToQuizSession(paper, user.id, `${paper.subject.name} - ${paper.chapter.name}`),
      },
    });
  } catch (error) {
    console.error('Chapter quiz creation failed:', error);
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'The chapter quiz could not be started.' },
      { status: 500 }
    );
  }
}
