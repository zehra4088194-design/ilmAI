'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { generateStudyPlanSessions } from '@/lib/planner/generate';
import { awardCoins } from '@/lib/gamification/coins';
import { COINS_PER_STUDY_SESSION, XP_PER_PLANNER_COMPLETION_MAX, XP_PER_PLANNER_COMPLETION_MIN } from '@/lib/gamification/constants';
import { awardXp } from '@/lib/gamification/xp';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';

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
    return { status: 'error', error: error?.message || 'Plan create nahi ho saka' };
  }

  try {
    await generateStudyPlanSessions(supabase as any, {
      planId: plan.id,
      studentId: user.id,
      examDate: payload.examDate,
      dailyAvailableHours: payload.dailyAvailableHours,
      focusSubjectIds: payload.focusSubjectIds,
      constraints,
    });
  } catch (generationError) {
    console.error('Plan session generation failed:', generationError);
    return { status: 'error', error: 'Plan bana, lekin sessions generate nahi ho sake' };
  }

  revalidatePath('/planner/today');
  revalidatePath('/planner/week');
  await createNotificationIfEnabled(supabase, 'studyReminders', {
    user_id: user.id,
    type: 'REMINDER',
    title: 'Smart study plan created',
    message: 'Aaj ka checklist ready hai. Planner open kar ke pehla session start karo.',
    link: '/planner/today',
    is_read: false,
  });
  return { status: 'success', planId: plan.id };
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
    message: `Great! ${xpEarned} XP add ho gaya. Next session continue karo.`,
    link: '/planner/today',
    is_read: false,
  });
  return { status: 'success', xpEarned };
}
