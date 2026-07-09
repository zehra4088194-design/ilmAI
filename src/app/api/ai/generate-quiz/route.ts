import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkQuizLimit } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface AiMcq {
  text: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  difficulty?: string;
  marks?: number;
}

function cleanCount(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(Math.max(Math.floor(parsed), 1), 30);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier, board, grade_level').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';

    const limitCheck = await checkQuizLimit(user.id, tier);
    if (!limitCheck.success) {
      return NextResponse.json({ status: 'error', error: 'Aaj ke quizzes khatam ho gaye. Pro plan lo unlimited quizzes ke liye!' }, { status: 429 });
    }

    const { subjectId, chapterIds, count = 10, difficulty = 'MEDIUM' } = await req.json();
    if (!subjectId || !chapterIds?.length) {
      return NextResponse.json({ status: 'error', error: 'Subject aur chapters required hain' }, { status: 400 });
    }

    const finalCount = cleanCount(count);
    const [{ data: subject }, { data: chapters }] = await Promise.all([
      supabase.from('subjects').select('id, name').eq('id', subjectId).single(),
      supabase.from('chapters').select('id, name').in('id', chapterIds),
    ]);

    if (!subject || !chapters?.length) {
      return NextResponse.json({ status: 'error', error: 'Subject ya chapter nahi mila' }, { status: 404 });
    }

    const chapterNames = chapters.map((chapter) => chapter.name).join(', ');
    const result = await gatewayChat({
      provider: 'groq',
      tier: tier === 'FREE' ? 'mini' : 'medium',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert Pakistani curriculum MCQ generator. Generate fresh, syllabus-plausible MCQs from chapter names. Return only valid JSON.',
        },
        {
          role: 'user',
          content: `Generate exactly ${finalCount} MCQs for Pakistan board practice.
Board: ${profile?.board || 'Pakistan board'}
Grade/Class: ${profile?.grade_level || 'GRADE_10'}
Subject: ${subject.name}
Chapter(s): ${chapterNames}
Difficulty: ${difficulty}

Return ONLY valid JSON array, no markdown:
[{"text":"question text","options":[{"id":"a","text":"..."},{"id":"b","text":"..."},{"id":"c","text":"..."},{"id":"d","text":"..."}],"correctAnswer":"a","explanation":"short explanation","difficulty":"MEDIUM","marks":1}]`,
        },
      ],
      maxTokens: 4096,
      temperature: 0.35,
    });

    const questions = parseAiJson<AiMcq[]>(result.text, []).map((q) => ({
      id: nanoid(),
      topicId: undefined,
      chapterId: chapterIds[0],
      subjectId,
      type: 'MCQ',
      difficulty: q.difficulty || difficulty,
      text: q.text,
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      marks: q.marks || 1,
      isVerified: false,
      timesAttempted: 0,
      correctRate: 0,
      createdAt: new Date().toISOString(),
    })).filter((q) => q.text && q.options.length >= 2 && q.correctAnswer);

    if (questions.length === 0) {
      return NextResponse.json({ status: 'error', error: 'Quiz generate nahi ho saka. Dobara try karo.' }, { status: 500 });
    }

    const session = {
      id: nanoid(), userId: user.id, subjectId, chapterIds, questions: questions.slice(0, finalCount),
      currentIndex: 0, answers: {}, startedAt: new Date().toISOString(), timeSpent: 0, status: 'IN_PROGRESS',
      totalMarks: questions.slice(0, finalCount).reduce((sum: number, q: { marks: number }) => sum + (q.marks || 1), 0),
      correctCount: 0, incorrectCount: 0, skippedCount: 0, mode: 'PRACTICE',
    };

    return NextResponse.json({ status: 'success', data: session });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json({ status: 'error', error: 'Quiz generate nahi ho saka' }, { status: 500 });
  }
}
