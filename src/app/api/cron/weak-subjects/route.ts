import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';

export const runtime = 'nodejs';

// Ongoing (not just signup-time) weak-subject detection from real quiz
// performance. Looks at the last 14 days of completed quiz_sessions,
// averages score per user+subject, and notifies when a subject's rolling
// average drops below ~50% — rate-limited to at most one such notification
// per subject per 7 days (same rate-limit approach as /api/marks).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createAdminClient();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: sessions } = await supabase
      .from('quiz_sessions')
      .select('user_id, subject_id, score')
      .eq('status', 'COMPLETED')
      .gte('started_at', fourteenDaysAgo)
      .not('score', 'is', null);

    if (!sessions?.length) return NextResponse.json({ status: 'success', processed: 0 });

    const grouped: Record<string, { userId: string; subjectId: string; total: number; count: number }> = {};
    for (const s of sessions) {
      const key = `${s.user_id}:${s.subject_id}`;
      if (!grouped[key]) grouped[key] = { userId: s.user_id, subjectId: s.subject_id, total: 0, count: 0 };
      grouped[key]!.total += s.score || 0;
      grouped[key]!.count += 1;
    }

    // Require at least 2 attempts before calling it a trend, not a fluke.
    const weakGroups = Object.values(grouped)
      .map((g) => ({ ...g, average: g.total / g.count }))
      .filter((g) => g.average < 50 && g.count >= 2);

    if (weakGroups.length === 0) return NextResponse.json({ status: 'success', processed: 0 });

    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, slug')
      .in('id', [...new Set(weakGroups.map((g) => g.subjectId))]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let created = 0;

    for (const g of weakGroups) {
      const subject = subjects?.find((s) => s.id === g.subjectId);
      if (!subject) continue;

      const linkUrl = `/practice?subject=${subject.slug}`;
      const { data: recent } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', g.userId)
        .eq('link', linkUrl)
        .gte('created_at', sevenDaysAgo)
        .limit(1);
      if (recent && recent.length > 0) continue;

      await createNotificationIfEnabled(supabase, 'weakSubjectAlerts', {
        user_id: g.userId,
        type: 'REMINDER',
        title: 'Focus Area Mili!',
        message: `Your performance in ${subject.name} needs attention. Add extra practice this week.`,
        link: linkUrl,
      });
      created++;
    }

    return NextResponse.json({ status: 'success', processed: created });
  } catch (error) {
    console.error('Weak subjects cron error:', error);
    return NextResponse.json({ status: 'error', error: 'Cron failed' }, { status: 500 });
  }
}
