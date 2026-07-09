import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

type PracticeType = 'short' | 'long';

interface PracticeQuestion {
  id: string;
  q: string;
  marks: number;
  keyPoints: string[];
  modelAnswer: string;
  guide?: string;
}

function cleanCount(value: unknown, type: PracticeType) {
  const fallback = type === 'short' ? 5 : 3;
  const max = type === 'short' ? 10 : 5;
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

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });
    }

    const { type, subjectId, chapterId, count } = await req.json();
    const questionType: PracticeType = type === 'long' ? 'long' : 'short';
    if (!subjectId || !chapterId) {
      return NextResponse.json({ status: 'error', error: 'Subject aur chapter required hain' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, board, grade_level')
      .eq('id', user.id)
      .single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';

    const limitCheck = await checkAiMessageLimit(user.id, tier);
    if (!limitCheck.success) {
      return NextResponse.json({ status: 'error', error: 'Daily AI limit khatam ho gayi' }, { status: 429 });
    }

    const [{ data: subject }, { data: chapter }] = await Promise.all([
      supabase.from('subjects').select('id, name').eq('id', subjectId).single(),
      supabase.from('chapters').select('id, name').eq('id', chapterId).single(),
    ]);

    if (!subject || !chapter) {
      return NextResponse.json({ status: 'error', error: 'Subject ya chapter nahi mila' }, { status: 404 });
    }

    const finalCount = cleanCount(count, questionType);
    const marks = questionType === 'short' ? 3 : 8;
    const prompt =
      questionType === 'short'
        ? `Generate ${finalCount} important SHORT questions for Pakistani curriculum.
Board: ${profile?.board || 'Pakistan board'}
Grade/Class: ${profile?.grade_level || 'GRADE_10'}
Subject: ${subject.name}
Chapter: ${chapter.name}

Return ONLY valid JSON array, no markdown:
[{"q":"question text","marks":3,"keyPoints":["point 1","point 2","point 3"],"modelAnswer":"ideal 3-5 sentence answer"}]`
        : `Generate ${finalCount} important LONG questions for Pakistani curriculum.
Board: ${profile?.board || 'Pakistan board'}
Grade/Class: ${profile?.grade_level || 'GRADE_10'}
Subject: ${subject.name}
Chapter: ${chapter.name}

Return ONLY valid JSON array, no markdown:
[{"q":"question text","marks":8,"keyPoints":["point 1","point 2","point 3","point 4","point 5"],"modelAnswer":"ideal detailed answer","guide":"~150-200 words"}]`;

    const result = await gatewayChat({
      provider: 'groq',
      tier: tier === 'FREE' ? 'mini' : 'medium',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert Pakistani board paper setter. Generate syllabus-plausible questions from the chapter name. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      maxTokens: questionType === 'short' ? 1800 : 2600,
      temperature: 0.35,
    });

    const questions = parseAiJson<PracticeQuestion[]>(result.text, []).map((question, index) => ({
      id: `${Date.now()}-${index}`,
      q: String(question.q || ''),
      marks: Number(question.marks) || marks,
      keyPoints: Array.isArray(question.keyPoints) ? question.keyPoints.map(String) : [],
      modelAnswer: String(question.modelAnswer || ''),
      guide: question.guide ? String(question.guide) : undefined,
    })).filter((question) => question.q);

    if (questions.length === 0) {
      return NextResponse.json({ status: 'error', error: 'Questions generate nahi ho sake. Dobara try karo.' }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      data: {
        type: questionType,
        subject,
        chapter,
        questions: questions.slice(0, finalCount),
      },
    });
  } catch (error) {
    console.error('Practice questions error:', error);
    return NextResponse.json({ status: 'error', error: 'Questions generate nahi ho sake' }, { status: 500 });
  }
}
