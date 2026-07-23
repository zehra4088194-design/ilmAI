import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { checkDemoRateLimit, createDemoSessionToken } from '@/lib/demo/rateLimit';
import { sanitizeDemoQuestion } from '@/lib/demo/questions';

export const runtime = 'nodejs';

const DEMO_COOKIE = 'ilm_ai_demo_session';
const DEMO_QUESTION_COUNT = 5;
const LIMIT_MESSAGE = "You've used your free demos for today - sign up free for unlimited practice.";

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export async function POST(req: NextRequest) {
  try {
    const rate = await checkDemoRateLimit(req);
    if (!rate.success) {
      return NextResponse.json({ status: 'limited', error: LIMIT_MESSAGE, reset: rate.reset }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedSubjectId = typeof body.subject_id === 'string' ? body.subject_id : null;
    const supabase = createServiceClient() as any;

    let subjectId = requestedSubjectId;
    if (!subjectId) {
      const { data: firstEligible } = await supabase
        .from('questions')
        .select('subject_id')
        .eq('is_demo_eligible', true)
        .eq('type', 'MCQ')
        .not('subject_id', 'is', null)
        .limit(1);
      subjectId = firstEligible?.[0]?.subject_id || null;
    }

    if (!subjectId) {
      return NextResponse.json({ status: 'error', error: 'Demo questions are not available yet. Sign up to use the full practice experience.' }, { status: 404 });
    }

    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, text, type, difficulty, marks, options')
      .eq('is_demo_eligible', true)
      .eq('subject_id', subjectId)
      .eq('type', 'MCQ')
      .limit(50);

    if (error) throw error;
    const selected = shuffle((questions || []).filter((question: any) => Array.isArray(question.options) && question.options.length >= 2)).slice(0, DEMO_QUESTION_COUNT);
    if (selected.length < DEMO_QUESTION_COUNT) {
      return NextResponse.json({ status: 'error', error: 'This subject does not yet have five curated demo MCQs.' }, { status: 404 });
    }

    const sessionToken = createDemoSessionToken();
    const { data: attempt, error: insertError } = await supabase
      .from('demo_attempts')
      .insert({
        session_token: sessionToken,
        subject_id: subjectId,
        question_ids: selected.map((question: any) => question.id),
        ip_hash: rate.ipHash,
      })
      .select('id, started_at')
      .single();

    if (insertError) throw insertError;

    const response = NextResponse.json({
      status: 'success',
      attempt: { id: attempt.id, started_at: attempt.started_at },
      questions: selected.map(sanitizeDemoQuestion),
      remaining: rate.remaining,
    });
    response.cookies.set(DEMO_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('demo start error:', error);
    return NextResponse.json({ status: 'error', error: 'The demo could not be started. Please try again shortly.' }, { status: 500 });
  }
}
