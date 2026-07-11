import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';

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

    const { data: links } = await supabase
      .from('parent_student_links')
      .select('parent_id, student_id')
      .in('student_id', userIds)
      .eq('status', 'approved');
    const snapshotByStudent = new Map(snapshots.map((snapshot) => [snapshot.student_id, snapshot]));
    const reports = [];
    for (const link of links || []) {
      if (!link.student_id) continue;
      const summary = snapshotByStudent.get(link.student_id);
      if (!summary) continue;
      let aiNarrative = `This week: ${summary.study_minutes} study minutes, ${summary.quizzes_completed} quizzes, ${summary.xp_earned} XP.`;
      try {
        const result = await gatewayChat({
          provider: 'groq',
          tier: 'mini',
          messages: [
            { role: 'system', content: 'Write a concise, supportive weekly parent report. No alarmist language. Return plain text.' },
            { role: 'user', content: JSON.stringify(summary) },
          ],
          maxTokens: 220,
          temperature: 0.3,
        });
        aiNarrative = result.text;
      } catch {}
      reports.push({
        parent_id: link.parent_id,
        student_id: link.student_id,
        week_start_date: weekStartStr,
        summary,
        ai_narrative: aiNarrative,
        suggested_actions: [
          summary.quizzes_completed === 0 ? 'Encourage one low-pressure practice quiz.' : 'Review quiz feedback together once.',
          summary.study_minutes < 120 ? 'Help reserve two short study blocks next week.' : 'Keep the current study rhythm steady.',
        ],
      });
    }
    if (reports.length) {
      await supabase.from('parent_weekly_reports' as any).upsert(reports, { onConflict: 'parent_id,student_id,week_start_date' });
    }

    return NextResponse.json({ status: 'success', processed: snapshots.length, parentReports: reports.length });
  } catch (error) {
    console.error('Cron snapshot error:', error);
    return NextResponse.json({ status: 'error', error: 'Snapshot failed' }, { status: 500 });
  }
}
