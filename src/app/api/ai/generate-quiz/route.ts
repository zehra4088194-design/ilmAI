import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getProtectedResource } from '@/lib/resources/server';
import { checkQuizLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

type StoredMcq = {
  q?: string;
  opts?: string[];
  correct?: number;
  exp?: string;
};

function cleanCount(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(Math.max(Math.floor(parsed), 1), 30);
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required.' }, { status: 401 });

    const { resourceId, count = 10 } = await req.json();
    if (typeof resourceId !== 'string' || !resourceId) {
      return NextResponse.json({ status: 'error', error: 'Select an uploaded chapter file first.' }, { status: 400 });
    }

    const resource = await getProtectedResource(user.id, 'library', resourceId, 'light');
    if (!resource) return NextResponse.json({ status: 'error', error: 'This chapter file is not available for your class.' }, { status: 404 });

    const tier = resource.tier as SubscriptionTier;
    const limitCheck = await checkQuizLimit(user.id, tier);
    if (!limitCheck.success) {
      return NextResponse.json(
        { status: 'error', error: await getConfiguredLimitExceededMessage(tier, 'Chapter testing') },
        { status: 429 }
      );
    }

    const db = createServiceClient() as any;
    const [{ data: mcqSet, error: mcqError }, { data: libraryResource }] = await Promise.all([
      db
        .from('resource_mcq_sets')
        .select('questions, status, error_message')
        .eq('resource_kind', 'library')
        .eq('resource_id', resourceId)
        .maybeSingle(),
      db.from('library_resources').select('subject_id, chapter_id').eq('id', resourceId).maybeSingle(),
    ]);

    if (mcqError) return NextResponse.json({ status: 'error', error: 'Saved chapter MCQs could not be loaded.' }, { status: 500 });
    if (!mcqSet || mcqSet.status !== 'ready') {
      return NextResponse.json(
        { status: 'error', error: mcqSet?.error_message || 'This file is still being processed. Try again once its chapter MCQs are ready.' },
        { status: 409 }
      );
    }

    const available = (Array.isArray(mcqSet.questions) ? mcqSet.questions : []).filter((question: StoredMcq) =>
      question.q && Array.isArray(question.opts) && question.opts.length >= 2 && Number.isInteger(question.correct)
    ) as StoredMcq[];
    const selected = shuffle(available).slice(0, cleanCount(count));
    if (!selected.length) {
      return NextResponse.json({ status: 'error', error: 'This file does not have ready MCQs yet.' }, { status: 409 });
    }

    const questions = selected.map((question, index) => {
      const options = (question.opts || []).map((text, optionIndex) => ({ id: String.fromCharCode(97 + optionIndex), text }));
      return {
        id: nanoid(),
        topicId: undefined,
        chapterId: libraryResource?.chapter_id || undefined,
        subjectId: libraryResource?.subject_id || undefined,
        type: 'MCQ' as const,
        difficulty: 'MEDIUM' as const,
        text: question.q || `Question ${index + 1}`,
        options,
        correctAnswer: options[Number(question.correct)]?.id || options[0]?.id || 'a',
        explanation: question.exp || `Answer taken from ${resource.title}.`,
        marks: 1,
        isVerified: true,
        timesAttempted: 0,
        correctRate: 0,
        createdAt: new Date().toISOString(),
      };
    });

    return NextResponse.json({
      status: 'success',
      data: {
        id: nanoid(),
        userId: user.id,
        subjectId: libraryResource?.subject_id || undefined,
        chapterIds: libraryResource?.chapter_id ? [libraryResource.chapter_id] : [],
        sourceTitle: resource.title,
        questions,
        currentIndex: 0,
        answers: {},
        startedAt: new Date().toISOString(),
        timeSpent: 0,
        status: 'IN_PROGRESS',
        totalMarks: questions.length,
        correctCount: 0,
        incorrectCount: 0,
        skippedCount: 0,
        mode: 'PRACTICE',
      },
    });
  } catch (error) {
    console.error('Source quiz creation failed:', error);
    return NextResponse.json({ status: 'error', error: 'The saved chapter quiz could not be started.' }, { status: 500 });
  }
}
