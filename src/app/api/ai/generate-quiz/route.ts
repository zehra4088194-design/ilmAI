import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkQuizLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import {
  chapterMcqsToQuizSession,
  generateChapterQuestionPaper,
} from '@/lib/tests/chapter-question-bank';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function cleanCount(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(Math.max(Math.floor(parsed), 1), 30);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required.' }, { status: 401 });

    const { subjectId, chapterId, count = 10 } = await req.json();
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

    const finalCount = cleanCount(count);
    const paper = await generateChapterQuestionPaper({
      subjectId,
      chapterId,
      mcqCount: finalCount,
      shortCount: 0,
      longCount: 0,
    });
    if (!paper.mcqs.length) {
      return NextResponse.json(
        { status: 'error', error: 'No source MCQs are available for this chapter yet.' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: chapterMcqsToQuizSession(paper, user.id, `${paper.subject.name} - ${paper.chapter.name}`),
    });
  } catch (error) {
    console.error('Chapter quiz creation failed:', error);
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'The chapter quiz could not be started.' },
      { status: 500 }
    );
  }
}
