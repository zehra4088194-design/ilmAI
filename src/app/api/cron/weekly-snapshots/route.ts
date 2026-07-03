import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const supabase = await createAdminClient();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const { data: sessions } = await supabase
      .from('study_sessions')
      .select('user_id, xp_earned, duration, type, date')
      .gte('date', weekStartStr);

    if (!sessions?.length) return NextResponse.json({ status: 'success', processed: 0 });

    const byUser: Record<string, typeof sessions> = {};
    for (const s of sessions) {
      if (!byUser[s.user_id]) byUser[s.user_id] = [];
      byUser[s.user_id]!.push(s);
    }

    const userIds = Object.keys(byUser);
    const { data: quizSessions } = await supabase
      .from('quiz_sessions')
      .select('user_id, score, status')
      .in('user_id', userIds)
      .eq('status', 'COMPLETED')
      .gte('started_at', weekStartStr);

    const quizByUser: Record<string, { count: number; totalScore: number }> = {};
    for (const q of quizSessions || []) {
      if (!quizByUser[q.user_id]) quizByUser[q.user_id] = { count: 0, totalScore: 0 };
      quizByUser[q.user_id]!.count += 1;
      quizByUser[q.user_id]!.totalScore += q.score || 0;
    }

    const { data: profiles } = await supabase.from('profiles').select('id, streak').in('id', userIds);
    const profileMap: Record<string, number> = {};
    for (const p of profiles || []) profileMap[p.id] = p.streak;

    const snapshots = userIds.map(userId => {
      const userSessions = byUser[userId] || [];
      const quizStats = quizByUser[userId] || { count: 0, totalScore: 0 };
      return {
        student_id: userId,
        week_start: weekStartStr,
        xp_earned: userSessions.reduce((sum, s) => sum + (s.xp_earned || 0), 0),
        quizzes_completed: quizStats.count,
        average_score: quizStats.count > 0 ? Math.round(quizStats.totalScore / quizStats.count * 100) / 100 : 0,
        study_minutes: Math.round(userSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60),
        streak_days: profileMap[userId] || 0,
        subjects_studied: [...new Set(userSessions.filter(s => s.type !== 'AI_CHAT').map(s => s.type))],
        ai_messages_sent: userSessions.filter(s => s.type === 'AI_CHAT').length,
      };
    });

    await supabase.from('student_weekly_snapshots').upsert(snapshots, { onConflict: 'student_id,week_start' });
    return NextResponse.json({ status: 'success', processed: snapshots.length });
  } catch (error) {
    console.error('Cron snapshot error:', error);
    return NextResponse.json({ status: 'error', error: 'Snapshot failed' }, { status: 500 });
  }
}