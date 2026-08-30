'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { generateStudyPlanSessions } from '@/lib/planner/generate';
import { awardCoins } from '@/lib/gamification/coins';
import {
  COINS_PER_STUDY_SESSION,
  XP_PER_PLANNER_COMPLETION_MAX,
  XP_PER_PLANNER_COMPLETION_MIN,
} from '@/lib/gamification/constants';
import { awardXp } from '@/lib/gamification/xp';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';
import { addDaysIso, pakistanDateIso } from '@/lib/dates/pakistan';

type SetupPayload = {
  examDate: string | null;
  focusSubjectIds: string[];
  dailyAvailableHours: number;
  preferredStudyTime?: string | null;
  constraints: Record<string, unknown>;
};

export async function createStudyPlan(payload: SetupPayload) {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error', error: 'Login required' };

  const constraints = {
    ...payload.constraints,
    preferred_study_time: payload.preferredStudyTime || null,
  };

  const { data: plan, error } = await db
    .from('study_plans')
    .insert({
      student_id: user.id,
      exam_date: payload.examDate || null,
      daily_available_hours: Math.min(Math.max(Number(payload.dailyAvailableHours) || 2, 0.5), 12),
      constraints,
      is_active: true,
    })
    .select('id')
    .single();

  if (error || !plan) {
    return { status: 'error', error: error?.message || 'The plan could not be created.' };
  }

  try {
    const sessions = await generateStudyPlanSessions(supabase as any, {
      planId: plan.id,
      studentId: user.id,
      examDate: payload.examDate,
      dailyAvailableHours: payload.dailyAvailableHours,
      focusSubjectIds: payload.focusSubjectIds,
      constraints,
    });
    if (!sessions.length) throw new Error('No study sessions were generated.');
  } catch (generationError) {
    console.error('Plan session generation failed:', generationError);
    await db.from('study_plans').delete().eq('id', plan.id).eq('student_id', user.id);
    return { status: 'error', error: 'Sessions could not be generated. Please try creating the plan again.' };
  }

  revalidatePath('/planner/today');
  revalidatePath('/planner/week');
  await createNotificationIfEnabled(supabase, 'studyReminders', {
    user_id: user.id,
    type: 'REMINDER',
    title: 'Smart study plan created',
    message: "Today's checklist is ready. Open Planner to start your first session.",
    link: '/planner/today',
    is_read: false,
  });
  return { status: 'success', planId: plan.id };
}

type AutoRevisionInput = {
  // 'weak_subject' (Phase 4a, from the weak-subjects cron) or 'exam_countdown' (Phase 4b, from a
  // routine_test/exam within 7 days) — both just call generateStudyPlanSessions with a different
  // examDate/constraints shape, same generator, same study_plans/study_plan_sessions tables as
  // createStudyPlan above. Neither creates a new table or a parallel generator.
  reason: 'weak_subject' | 'exam_countdown';
  focusSubjectIds: string[];
  examDate?: string | null;
  constraints?: Record<string, unknown>;
};

/**
 * Injects a short auto-generated plan directly into the student's existing planner instead of just
 * linking out to /practice. A 7-day mini plan for 'weak_subject' (no real deadline to target), or a
 * plan running through the actual exam/test date for 'exam_countdown'. Idempotent per reason+day —
 * won't stack a duplicate mini plan if the student re-opens the same notification link twice.
 */
export async function generateAutoRevisionPlan(input: AutoRevisionInput) {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error' as const, error: 'Login required' };
  if (!input.focusSubjectIds.length) return { status: 'error' as const, error: 'No subject to build a plan for.' };

  const today = pakistanDateIso();
  const constraints = { ...input.constraints, auto_generated_reason: input.reason, auto_generated_date: today };

  const { data: existing } = await db
    .from('study_plans')
    .select('id')
    .eq('student_id', user.id)
    .eq('is_active', true)
    .contains('constraints', { auto_generated_reason: input.reason, auto_generated_date: today })
    .maybeSingle();
  if (existing) return { status: 'success' as const, planId: existing.id, deduped: true };

  // Phase 4b: for an exam-countdown plan, pull the student's actual incorrect answers for this
  // subject (from quiz_sessions.answers, already recorded per-question at quiz completion — see
  // buildAnswerSignals in src/lib/quiz/complete.ts) so generateStudyPlanSessions' existing gatewayChat
  // call (same AI routing pattern every other planner generation already uses) prioritizes real
  // past mistakes instead of guessing.
  if (input.reason === 'exam_countdown') {
    const { data: recentSessions } = await db
      .from('quiz_sessions')
      .select('answers')
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED')
      .in('subject_id', input.focusSubjectIds)
      .order('completed_at', { ascending: false })
      .limit(20);

    const mistakes: Array<{ chapterId: string | null; questionType: string; difficulty: string | null }> = [];
    for (const session of recentSessions || []) {
      for (const signal of Object.values((session.answers || {}) as Record<string, any>)) {
        if (signal?.isCorrect === false) {
          mistakes.push({
            chapterId: signal.chapterId || null,
            questionType: signal.questionType || 'MCQ',
            difficulty: signal.difficulty || null,
          });
        }
      }
    }
    if (mistakes.length) {
      const chapterCounts = new Map<string, number>();
      for (const m of mistakes) {
        if (m.chapterId) chapterCounts.set(m.chapterId, (chapterCounts.get(m.chapterId) || 0) + 1);
      }
      (constraints as any).pastMistakeChapterIds = Array.from(chapterCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([chapterId]) => chapterId)
        .slice(0, 10);
      (constraints as any).pastMistakeCount = mistakes.length;
    }
  }

  const examDate = input.examDate || addDaysIso(today, 6);
  const { data: plan, error } = await db
    .from('study_plans')
    .insert({
      student_id: user.id,
      exam_date: examDate,
      daily_available_hours: 1.5,
      constraints,
      is_active: true,
    })
    .select('id')
    .single();
  if (error || !plan) return { status: 'error' as const, error: error?.message || 'The plan could not be created.' };

  try {
    const sessions = await generateStudyPlanSessions(db, {
      planId: plan.id,
      studentId: user.id,
      examDate,
      dailyAvailableHours: 1.5,
      focusSubjectIds: input.focusSubjectIds,
      constraints,
    });
    if (!sessions.length) throw new Error('No study sessions were generated.');
  } catch (generationError) {
    console.error('Auto revision plan generation failed:', generationError);
    await db.from('study_plans').delete().eq('id', plan.id).eq('student_id', user.id);
    return { status: 'error' as const, error: 'The revision plan could not be generated.' };
  }

  revalidatePath('/planner/today');
  revalidatePath('/planner/week');
  return { status: 'success' as const, planId: plan.id };
}

export async function completePlannerSession(sessionId: string) {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error', error: 'Login required' };

  const { data: session } = await db
    .from('study_plan_sessions')
    .select('id, student_id, subject_id, session_type, duration_minutes, is_completed')
    .eq('id', sessionId)
    .eq('student_id', user.id)
    .single();

  if (!session) return { status: 'error', error: 'Session not found' };
  if (session.is_completed) return { status: 'success' };

  const completedAt = new Date().toISOString();
  const xpEarned = Math.max(
    XP_PER_PLANNER_COMPLETION_MIN,
    Math.min(XP_PER_PLANNER_COMPLETION_MAX, Math.round(Number(session.duration_minutes || 0) / 3))
  );

  const { error } = await db
    .from('study_plan_sessions')
    .update({ is_completed: true, completed_at: completedAt })
    .eq('id', sessionId)
    .eq('student_id', user.id);

  if (error) return { status: 'error', error: error.message };

  await supabase.from('study_sessions').insert({
    user_id: user.id,
    subject_id: session.subject_id,
    type: session.session_type === 'mock_test' ? 'QUIZ' : 'READING',
    duration: Number(session.duration_minutes || 0) * 60,
    xp_earned: xpEarned,
    date: completedAt.slice(0, 10),
  });

  const { data: profile } = await supabase.from('profiles').select('total_study_time').eq('id', user.id).single();
  if (profile) {
    await awardXp(user.id, xpEarned, 'study_session_complete');
    await awardCoins(user.id, COINS_PER_STUDY_SESSION, 'study_session_complete', sessionId);
    await supabase
      .from('profiles')
      .update({
        total_study_time: (profile.total_study_time || 0) + Number(session.duration_minutes || 0) * 60,
      })
      .eq('id', user.id);
    await supabase.rpc('update_streak', { p_user_id: user.id });
  }

  revalidatePath('/planner/today');
  revalidatePath('/planner/week');
  await createNotificationIfEnabled(supabase, 'achievements', {
    user_id: user.id,
    type: 'ACHIEVEMENT',
    title: 'Study session complete',
    message: `${xpEarned} XP added. Continue to your next session.`,
    link: '/planner/today',
    is_read: false,
  });
  return { status: 'success', xpEarned };
}
