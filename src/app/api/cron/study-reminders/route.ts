import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';

export const runtime = 'nodejs';

function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function recentlyNotified(admin: any, userId: string, link: string, title: string, sinceIso: string) {
  const { data } = await admin
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('link', link)
    .eq('title', title)
    .gte('created_at', sinceIso)
    .limit(1);
  return Boolean(data?.length);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await createAdminClient() as any;
  const today = localDate();
  const tomorrow = localDate(1);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let created = 0;

  const { data: sessions } = await admin
    .from('study_plan_sessions')
    .select('id, student_id, session_date, session_type, duration_minutes, is_completed, subjects(name), chapters(name)')
    .in('session_date', [today, tomorrow])
    .eq('is_completed', false)
    .limit(500);

  for (const session of sessions || []) {
    const isToday = session.session_date === today;
    const title = isToday ? "Today's study plan is ready" : "Tomorrow's study plan is ready";
    const link = `${isToday ? '/planner/today' : '/planner/week'}?session=${session.id}`;
    if (await recentlyNotified(admin, session.student_id, link, title, oneDayAgo)) continue;

    const subject = session.subjects?.name || session.chapters?.name || 'Study block';
    await createNotificationIfEnabled(admin, 'studyReminders', {
      user_id: session.student_id,
      type: 'REMINDER',
      title,
      message: `${subject}: ${session.duration_minutes} min ${String(session.session_type || 'study').replace('_', ' ')}`,
      link,
      is_read: false,
    });
    created++;
  }

  const now = new Date();
  const next24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: tests } = await admin
    .from('routine_tests')
    .select('id, student_id, subject, title, scheduled_at, status')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', next24Hours)
    .neq('status', 'completed')
    .limit(500);

  for (const test of tests || []) {
    const title = 'Routine test reminder';
    const link = `/routine?test=${test.id}`;
    if (await recentlyNotified(admin, test.student_id, link, title, oneDayAgo)) continue;

    await createNotificationIfEnabled(admin, 'routineTestAlerts', {
      user_id: test.student_id,
      type: 'REMINDER',
      title,
      message: `${test.subject}: ${test.title} - ${new Date(test.scheduled_at).toLocaleString('en-PK')}`,
      link,
      is_read: false,
    });
    created++;
  }

  return NextResponse.json({ status: 'success', created });
}
