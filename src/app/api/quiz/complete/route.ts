import { after, NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recomputeDigitalTwin, shouldRecomputeDigitalTwin } from '@/lib/digital-twin/recompute';
import { awardCoins } from '@/lib/gamification/coins';
import { COINS_PER_QUIZ_COMPLETION, XP_PER_CORRECT_QUIZ_ANSWER } from '@/lib/gamification/constants';
import { awardXp } from '@/lib/gamification/xp';
import type { QuizSession } from '@/types';

export const runtime = 'nodejs';

function elapsedSeconds(startedAt: string, fallback = 0) {
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return fallback;
  return Math.max(fallback, Math.round((Date.now() - started) / 1000));
}

function buildAnswerSignals(session: QuizSession) {
  return Object.fromEntries(
    session.questions.map((question) => [
      question.id,
      {
        answer: session.answers[question.id],
        correctAnswer: question.correctAnswer,
        isCorrect: question.isCorrect === true,
        questionType: question.type || 'MCQ',
        subjectId: question.subjectId || session.subjectId,
        chapterId: question.chapterId || session.chapterIds?.[0],
        difficulty: question.difficulty,
      },
    ])
  );
}

function scheduleTwinRecompute(studentId: string) {
  after(async () => {
    try {
      if (await shouldRecomputeDigitalTwin(studentId)) {
        await recomputeDigitalTwin(studentId);
      }
    } catch (error) {
      console.error('Digital twin recompute failed:', error);
    }
  });
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

    const session = (await req.json()) as QuizSession;
    if (!session?.subjectId || !session.questions?.length) {
      return NextResponse.json({ status: 'error', error: 'Invalid quiz session' }, { status: 400 });
    }

    const completedAt = session.completedAt || new Date().toISOString();
    const timeSpent = Math.max(session.timeSpent || 0, elapsedSeconds(session.startedAt, session.timeSpent || 0));
    const totalMarks = session.totalMarks || session.questions.reduce((sum, question) => sum + (question.marks || 1), 0);
    const score = session.score ?? Math.round((session.correctCount / Math.max(1, session.questions.length)) * 100);

    const { data: inserted, error } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id: user.id,
        subject_id: session.subjectId,
        chapter_ids: session.chapterIds || [],
        questions: session.questions as any,
        current_index: session.currentIndex,
        answers: buildAnswerSignals(session) as any,
        started_at: session.startedAt,
        completed_at: completedAt,
        time_limit: session.timeLimit || null,
        time_spent: timeSpent,
        status: 'COMPLETED',
        score,
        total_marks: totalMarks,
        correct_count: session.correctCount,
        incorrect_count: session.incorrectCount,
        skipped_count: session.skippedCount,
        mode: session.mode || 'PRACTICE',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Quiz completion insert failed:', error);
      return NextResponse.json({ status: 'error', error: 'Quiz result save nahi ho saka' }, { status: 500 });
    }

    const xpEarned = Math.max(0, Math.min(100, session.correctCount * XP_PER_CORRECT_QUIZ_ANSWER));
    await supabase.from('study_sessions').insert({
      user_id: user.id,
      subject_id: session.subjectId,
      type: 'QUIZ',
      duration: timeSpent,
      xp_earned: xpEarned,
      date: new Date().toISOString().slice(0, 10),
    });

    const { data: profile } = await supabase.from('profiles').select('total_study_time').eq('id', user.id).single();
    await awardXp(user.id, xpEarned, 'quiz_complete');
    await awardCoins(user.id, COINS_PER_QUIZ_COMPLETION, 'quiz_complete', inserted.id);
    await supabase
      .from('profiles')
      .update({ total_study_time: (profile?.total_study_time || 0) + timeSpent })
      .eq('id', user.id);
    await supabase.rpc('update_streak', { p_user_id: user.id });

    scheduleTwinRecompute(user.id);

    return NextResponse.json({
      status: 'success',
      data: { id: inserted.id, xpEarned },
    });
  } catch (error) {
    console.error('Quiz completion error:', error);
    return NextResponse.json({ status: 'error', error: 'Quiz result save nahi ho saka' }, { status: 500 });
  }
}
