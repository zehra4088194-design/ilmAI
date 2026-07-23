import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { gatewayChat } from '@/lib/ai/gateway';
import { normalizeAnswer, sanitizeDemoQuestion, type DemoQuestionResult } from '@/lib/demo/questions';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DEMO_COOKIE = 'ilm_ai_demo_session';

function fallbackFeedback(correct: number, total: number) {
  if (correct === total) return `Excellent start - you got ${correct}/${total}. Sign up free to save progress and unlock full practice.`;
  if (correct >= Math.ceil(total * 0.6)) return `Nice work - you scored ${correct}/${total}. A little more practice can turn this into a top score.`;
  return `You got ${correct}/${total} - good first try. Sign up free and ilm AI will help you improve chapter by chapter.`;
}

async function generateFeedback(correct: number, total: number, subjectName?: string) {
  try {
    const result = await gatewayChat({
      provider: 'groq',
      tier: 'mini',
      messages: [
        { role: 'system', content: 'Write short, encouraging feedback in professional English for a student quiz result. Use no more than two sentences and no Markdown.' },
        { role: 'user', content: `Subject: ${subjectName || 'Demo'}\nScore: ${correct}/${total}\nNudge them to sign up free to save progress and practice more.` },
      ],
      maxTokens: 120,
      temperature: 0.5,
    });
    return result.text.trim() || fallbackFeedback(correct, total);
  } catch {
    return fallbackFeedback(correct, total);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(DEMO_COOKIE)?.value;
    if (!sessionToken) return NextResponse.json({ status: 'error', error: 'The demo session expired. Start it again.' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const answers = body.answers && typeof body.answers === 'object' ? body.answers as Record<string, unknown> : {};
    const supabase = createServiceClient() as any;

    const { data: attempt, error: attemptError } = await supabase
      .from('demo_attempts')
      .select('id, subject_id, question_ids, completed_at, subjects(name)')
      .eq('session_token', sessionToken)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (attemptError) throw attemptError;
    if (!attempt) return NextResponse.json({ status: 'error', error: 'The demo attempt was not found. Start it again.' }, { status: 404 });
    if (attempt.completed_at) return NextResponse.json({ status: 'error', error: 'This demo has already been submitted.' }, { status: 409 });

    const questionIds = attempt.question_ids || [];
    const { data: questions, error: questionError } = await supabase
      .from('questions')
      .select('id, text, type, difficulty, marks, options, correct_answer, explanation')
      .in('id', questionIds);

    if (questionError) throw questionError;

    const orderedQuestions = questionIds
      .map((id: string) => (questions || []).find((question: any) => question.id === id))
      .filter(Boolean);

    let correctCount = 0;
    const breakdown: DemoQuestionResult[] = orderedQuestions.map((question: any) => {
      const userAnswer = normalizeAnswer(answers[question.id]);
      const correctAnswer = normalizeAnswer(question.correct_answer);
      const isCorrect = Boolean(userAnswer) && userAnswer === correctAnswer;
      if (isCorrect) correctCount += 1;
      return {
        ...sanitizeDemoQuestion(question),
        userAnswer: userAnswer || null,
        correctAnswer,
        explanation: question.explanation || null,
        isCorrect,
      };
    });

    const totalCount = breakdown.length;
    const score = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;
    const subject = Array.isArray(attempt.subjects) ? attempt.subjects[0] : attempt.subjects;
    const feedback = await generateFeedback(correctCount, totalCount, subject?.name);

    const { error: updateError } = await supabase
      .from('demo_attempts')
      .update({
        answers,
        score,
        correct_count: correctCount,
        total_count: totalCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', attempt.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      status: 'success',
      result: {
        score,
        correct_count: correctCount,
        total_count: totalCount,
        feedback,
        breakdown,
      },
    });
  } catch (error) {
    console.error('demo submit error:', error);
    return NextResponse.json({ status: 'error', error: 'The demo could not be submitted. Please try again.' }, { status: 500 });
  }
}
