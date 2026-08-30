import { after } from 'next/server';
import { recomputeDigitalTwin, shouldRecomputeDigitalTwin } from '@/lib/digital-twin/recompute';
import { awardCoins } from '@/lib/gamification/coins';
import { COINS_PER_QUIZ_COMPLETION, XP_PER_CORRECT_QUIZ_ANSWER } from '@/lib/gamification/constants';
import { awardXp } from '@/lib/gamification/xp';
import { recordMistakeWithRevision, updateChapterMastery } from '@/lib/learning/mastery';
import type { QuizSession } from '@/types';

/**
 * Single source of truth for "a quiz session finished" — scoring, XP/coin award, mistake
 * tracking, and digital-twin recompute. Used by both the live online completion route
 * (src/app/api/quiz/complete/route.ts) and the offline-sync replay
 * (src/app/api/offline/sync/route.ts) so a queued-while-offline completion goes through exactly
 * the same ledger logic as a normal one, just delivered later.
 */

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

async function updateLearningSignals(db: any, studentId: string, session: QuizSession) {
  const byChapter = new Map<string, { subjectId: string | null; correct: number; incorrect: number }>();
  for (const question of session.questions) {
    const chapterId = question.chapterId || session.chapterIds?.[0];
    const subjectId = question.subjectId || session.subjectId;
    if (chapterId) {
      const current = byChapter.get(chapterId) || { subjectId, correct: 0, incorrect: 0 };
      if (question.isCorrect === true) current.correct += 1;
      else current.incorrect += 1;
      byChapter.set(chapterId, current);
    }
    if (question.isCorrect === true) continue;
    await recordMistakeWithRevision(db, {
      studentId,
      questionId: question.id || null,
      subjectId,
      chapterId,
      conceptId: (question as any).conceptId || null,
      source: session.mode || 'quiz',
      questionText: question.text || (question as any).question || 'Question',
      selectedAnswer: session.answers?.[question.id] == null ? null : String(session.answers[question.id]),
      correctAnswer: question.correctAnswer == null ? null : String(question.correctAnswer),
      explanation: question.explanation || null,
    });
  }

  for (const [chapterId, signal] of byChapter) {
    await updateChapterMastery(db, {
      studentId,
      subjectId: signal.subjectId,
      chapterId,
      correct: signal.correct,
      incorrect: signal.incorrect,
      source: session.mode || 'quiz',
    });
  }
}

export type CompleteQuizResult =
  | { ok: true; status: number; body: { status: 'success'; data: { id: string; xpEarned: number }; deduped?: boolean } }
  | { ok: false; status: number; body: { status: 'error'; error: string } };

export async function completeQuizSession(
  supabase: any,
  userId: string,
  rawSession: unknown,
  idempotencyKey?: string | null
): Promise<CompleteQuizResult> {
  const session = rawSession as QuizSession;
  if (!session?.subjectId || !session.questions?.length) {
    return { ok: false, status: 400, body: { status: 'error', error: 'Invalid quiz session' } };
  }

  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from('quiz_sessions')
      .select('id')
      .eq('client_idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existing) {
      return { ok: true, status: 200, body: { status: 'success', data: { id: existing.id, xpEarned: 0 }, deduped: true } };
    }
  }

  const completedAt = session.completedAt || new Date().toISOString();
  const timeSpent = Math.max(session.timeSpent || 0, elapsedSeconds(session.startedAt, session.timeSpent || 0));
  const totalMarks = session.totalMarks || session.questions.reduce((sum, question) => sum + (question.marks || 1), 0);
  const score = session.score ?? Math.round((session.correctCount / Math.max(1, session.questions.length)) * 100);

  const { data: inserted, error } = await supabase
    .from('quiz_sessions')
    .insert({
      user_id: userId,
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
      client_idempotency_key: idempotencyKey || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Quiz completion insert failed:', error);
    return { ok: false, status: 500, body: { status: 'error', error: 'The quiz result could not be saved.' } };
  }

  const xpEarned = Math.max(0, Math.min(100, session.correctCount * XP_PER_CORRECT_QUIZ_ANSWER));
  await supabase.from('study_sessions').insert({
    user_id: userId,
    subject_id: session.subjectId,
    type: 'QUIZ',
    duration: timeSpent,
    xp_earned: xpEarned,
    date: new Date().toISOString().slice(0, 10),
  });

  const { data: profile } = await supabase.from('profiles').select('total_study_time').eq('id', userId).single();
  await awardXp(userId, xpEarned, 'quiz_complete');
  await awardCoins(userId, COINS_PER_QUIZ_COMPLETION, 'quiz_complete', inserted.id);
  await supabase
    .from('profiles')
    .update({ total_study_time: (profile?.total_study_time || 0) + timeSpent })
    .eq('id', userId);
  await supabase.rpc('update_streak', { p_user_id: userId });
  await updateLearningSignals(supabase, userId, session);

  scheduleTwinRecompute(userId);

  return { ok: true, status: 200, body: { status: 'success', data: { id: inserted.id, xpEarned } } };
}
