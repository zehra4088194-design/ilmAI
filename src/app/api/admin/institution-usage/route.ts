import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';

type UsageRow = {
  id: string;
  sponsored_institution_name: string | null;
  sponsored_institution_type: string | null;
  subscription_tier: string;
  total_study_time: number;
  xp: number;
  created_at: string;
};

export async function GET() {
  const adminUser = await requireAdminUser();
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = (await createAdminClient()) as any;
  const { data: profiles, error: profileError } = await db
    .from('profiles')
    .select(
      'id, sponsored_institution_name, sponsored_institution_type, subscription_tier, total_study_time, xp, created_at'
    )
    .not('sponsored_institution_name', 'is', null)
    .order('created_at', { ascending: false });
  if (profileError)
    return NextResponse.json({ error: `Institution users load nahi hue: ${profileError.message}` }, { status: 500 });

  const rows = (profiles || []) as UsageRow[];
  const userIds = rows.map((row) => row.id);
  const [{ data: studySessions }, { data: quizSessions }] = userIds.length
    ? await Promise.all([
        db.from('study_sessions').select('user_id, duration, date').in('user_id', userIds),
        db
          .from('quiz_sessions')
          .select('user_id, score, status, completed_at')
          .in('user_id', userIds)
          .eq('status', 'COMPLETED'),
      ])
    : [{ data: [] }, { data: [] }];

  const studyByUser = new Map<string, { seconds: number; activeRecently: boolean }>();
  for (const session of studySessions || []) {
    const current = studyByUser.get(session.user_id) || { seconds: 0, activeRecently: false };
    current.seconds += Number(session.duration) || 0;
    if (session.date && new Date(session.date).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000)
      current.activeRecently = true;
    studyByUser.set(session.user_id, current);
  }
  const quizzesByUser = new Map<string, { count: number; scoreTotal: number; scoreCount: number }>();
  for (const quiz of quizSessions || []) {
    const current = quizzesByUser.get(quiz.user_id) || { count: 0, scoreTotal: 0, scoreCount: 0 };
    current.count += 1;
    if (quiz.score !== null && quiz.score !== undefined) {
      current.scoreTotal += Number(quiz.score) || 0;
      current.scoreCount += 1;
    }
    quizzesByUser.set(quiz.user_id, current);
  }

  const institutions = new Map<string, any>();
  for (const profile of rows) {
    const name = profile.sponsored_institution_name?.trim();
    if (!name) continue;
    const type = profile.sponsored_institution_type || 'college';
    const key = `${type}:${name.toLowerCase()}`;
    const current = institutions.get(key) || {
      institution_name: name,
      institution_type: type,
      student_count: 0,
      active_students: 0,
      total_study_minutes: 0,
      total_quizzes: 0,
      average_quiz_score_total: 0,
      average_quiz_score_count: 0,
      total_xp: 0,
      plans: { FREE: 0, PRO: 0, ELITE: 0 },
    };
    const study = studyByUser.get(profile.id);
    const quizzes = quizzesByUser.get(profile.id);
    current.student_count += 1;
    current.active_students += study?.activeRecently ? 1 : 0;
    current.total_study_minutes += study ? study.seconds / 60 : (Number(profile.total_study_time) || 0) / 60;
    current.total_quizzes += quizzes?.count || 0;
    current.average_quiz_score_total += quizzes?.scoreTotal || 0;
    current.average_quiz_score_count += quizzes?.scoreCount || 0;
    current.total_xp += Number(profile.xp) || 0;
    if (current.plans[profile.subscription_tier] !== undefined) current.plans[profile.subscription_tier] += 1;
    institutions.set(key, current);
  }

  return NextResponse.json({
    institutions: Array.from(institutions.values()).map((item) => ({
      ...item,
      average_quiz_score: item.average_quiz_score_count
        ? Math.round(item.average_quiz_score_total / item.average_quiz_score_count)
        : null,
    })),
  });
}
