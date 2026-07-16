'use server';

import { createClient } from '@/lib/supabase/server';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(startIso: string, offset: number) {
  const date = new Date(`${startIso}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

export async function rescheduleMissedSessions(planId: string) {
  const supabase = await createClient();
  const db = supabase as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error', error: 'Login required' };

  const { data: plan } = await db
    .from('study_plans')
    .select('id, student_id, exam_date, daily_available_hours')
    .eq('id', planId)
    .eq('student_id', user.id)
    .single();

  if (!plan) return { status: 'error', error: 'Plan not found' };

  const today = todayIso();
  const { data: missed, error } = await db
    .from('study_plan_sessions')
    .select('id, duration_minutes')
    .eq('plan_id', planId)
    .eq('student_id', user.id)
    .eq('is_completed', false)
    .lt('session_date', today)
    .order('session_date', { ascending: true });

  if (error) return { status: 'error', error: error.message };
  if (!missed?.length) return { status: 'success', moved: 0 };

  const examDate = plan.exam_date || addDaysIso(today, 7);
  const remainingDays = Math.max(1, Math.ceil((new Date(`${examDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000) + 1);
  const dailyLimit = Math.max(30, Math.round(Number(plan.daily_available_hours || 2) * 60));
  const compression = remainingDays < missed.length ? Math.max(15, Math.floor(dailyLimit / Math.ceil(missed.length / remainingDays))) : null;

  await Promise.all(
    missed.map((session: { id: string; duration_minutes: number }, index: number) =>
      db
        .from('study_plan_sessions')
        .update({
          session_date: addDaysIso(today, index % remainingDays),
          duration_minutes: compression ? Math.min(session.duration_minutes, compression) : session.duration_minutes,
        })
        .eq('id', session.id)
        .eq('student_id', user.id)
    )
  );

  return { status: 'success', moved: missed.length };
}
