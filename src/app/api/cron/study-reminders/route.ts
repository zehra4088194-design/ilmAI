import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';
import { addDaysIso, pakistanDateIso } from '@/lib/dates/pakistan';

export const runtime = 'nodejs';

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

  const admin = (await createAdminClient()) as any;
  const today = pakistanDateIso();
  const tomorrow = addDaysIso(today, 1);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let created = 0;

  const { data: sessions } = await admin
    .from('study_plan_sessions')
    .select(
      'id, student_id, session_date, session_type, duration_minutes, is_completed, subjects(name), chapters(name)'
    )
    .in('session_date', [today, tomorrow])
    .eq('is_completed', false)
    .limit(500);

  for (const session of sessions || []) {
    const isToday = session.session_date === today;
    const title = isToday ? "Today's study plan is ready" : "Tomorrow's study plan is ready";
    const link = `${isToday ? '/planner/today' : '/planner/week'}?session=${session.id}#session-${session.id}`;
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

  // Phase 4b: exam-countdown smart revision — a wider 7-day lookahead (the block above stays a
  // same-day reminder). Clicking through builds a targeted plan from the student's actual past
  // incorrect answers for that subject (see generateAutoRevisionPlan's exam_countdown branch)
  // instead of just reminding them the test exists.
  const next7Days = addDaysIso(today, 7);
  const { data: upcomingTests } = await admin
    .from('routine_tests')
    .select('id, student_id, subject, title, scheduled_at, status')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', `${next7Days}T23:59:59Z`)
    .neq('status', 'completed')
    .limit(500);

  for (const test of upcomingTests || []) {
    const examDateIso = String(test.scheduled_at).slice(0, 10);
    const title = 'Targeted revision plan ready';

    const { data: subjectRow } = await admin.from('subjects').select('id').ilike('name', test.subject).maybeSingle();
    if (!subjectRow) continue; // Can't build a plan without a resolvable subject_id.

    const link = `/planner/today?autoRevision=exam_countdown&subjectId=${subjectRow.id}&examDate=${examDateIso}&testId=${test.id}`;
    // Deduped per exact link (subject+date+test), same helper as every other reminder in this
    // route — a rescheduled test date naturally produces a new link and re-triggers.
    if (await recentlyNotified(admin, test.student_id, link, title, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())) {
      continue;
    }

    await createNotificationIfEnabled(admin, 'routineTestAlerts', {
      user_id: test.student_id,
      type: 'REMINDER',
      title,
      message: `${test.title} (${test.subject}) is in ${Math.max(1, Math.ceil((new Date(test.scheduled_at).getTime() - Date.now()) / 86_400_000))} day(s). A revision plan based on your past mistakes is ready.`,
      link,
      is_read: false,
    });
    created++;
  }

  return NextResponse.json({ status: 'success', created });
}
