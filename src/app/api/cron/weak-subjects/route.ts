import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';

export const runtime = 'nodejs';

// Ongoing (not just signup-time) weak-subject detection from real quiz
// performance. Looks at the last 14 days of completed quiz_sessions,
// averages score per user+subject, and notifies when a subject's rolling
// average drops below ~50% — rate-limited to at most one such notification
// per subject per 7 days (same rate-limit approach as /api/marks).
//
// Also bootstraps from subject_condition_baseline — the self-reported "Strong / Steady / Needs
// focus" per subject a student picks in the onboarding modal (PersonalizationModal), which until
// now was collected and never read back anywhere. A brand-new student has no quiz_sessions yet,
// so the real-performance check above stays silent for weeks; this covers that cold-start gap by
// alerting once (dedupe below is "ever", not just 7 days — the baseline itself never changes) for
// any subject they flagged 'needs-work' with zero completed quizzes in it so far.
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

    const grouped: Record<string, { userId: string; subjectId: string; total: number; count: number }> = {};
    for (const s of sessions || []) {
      const key = `${s.user_id}:${s.subject_id}`;
      if (!grouped[key]) grouped[key] = { userId: s.user_id, subjectId: s.subject_id, total: 0, count: 0 };
      grouped[key]!.total += s.score || 0;
      grouped[key]!.count += 1;
    }

    // Require at least 2 attempts before calling it a trend, not a fluke.
    const weakGroups = Object.values(grouped)
      .map((g) => ({ ...g, average: g.total / g.count }))
      .filter((g) => g.average < 50 && g.count >= 2);

    // Cold-start bootstrap (see the doc comment above): subjects a student flagged 'needs-work'
    // at onboarding, where they still have zero completed quizzes ever (not just the 14-day
    // window above) — real performance data hasn't had a chance to say anything yet.
    const { data: baselineProfiles } = await supabase
      .from('profiles')
      .select('id, subject_condition_baseline')
      .not('subject_condition_baseline', 'is', null)
      .limit(200);
    const baselinePairs = (baselineProfiles || []).flatMap((p: any) =>
      Object.entries((p.subject_condition_baseline || {}) as Record<string, string>)
        .filter(([, condition]) => condition === 'needs-work')
        .map(([subjectId]) => ({ userId: p.id as string, subjectId }))
    );
    let everQuizzed = new Set<string>();
    if (baselinePairs.length) {
      const { data: everSessions } = await supabase
        .from('quiz_sessions')
        .select('user_id, subject_id')
        .eq('status', 'COMPLETED')
        .in(
          'user_id',
          [...new Set(baselinePairs.map((p) => p.userId))]
        );
      everQuizzed = new Set((everSessions || []).map((s: any) => `${s.user_id}:${s.subject_id}`));
    }
    const bootstrapGroups = baselinePairs
      .filter((p) => !everQuizzed.has(`${p.userId}:${p.subjectId}`))
      .map((p) => ({ userId: p.userId, subjectId: p.subjectId, average: 0, count: 0, bootstrap: true as const }));

    const allGroups = [...weakGroups.map((g) => ({ ...g, bootstrap: false as const })), ...bootstrapGroups];
    if (allGroups.length === 0) return NextResponse.json({ status: 'success', processed: 0 });

    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name, slug')
      .in('id', [...new Set(allGroups.map((g) => g.subjectId))]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let created = 0;

    for (const g of allGroups) {
      const subject = subjects?.find((s) => s.id === g.subjectId);
      if (!subject) continue;

      // Phase 4a: clicking through now injects a 7-day mini revision plan directly into the
      // planner (see generateAutoRevisionPlan / planner/today/page.tsx) instead of just linking to
      // /practice — the dedupe check below still keys off this exact link string, so it also
      // prevents re-generating the same mini plan more than once a week for the same subject.
      const linkUrl = `/planner/today?autoRevision=weak_subject&subjectId=${g.subjectId}`;
      let recentQuery = supabase.from('notifications').select('id').eq('user_id', g.userId).eq('link', linkUrl);
      // Real weak-performance alerts re-fire at most weekly (score can genuinely still be low next
      // week); the baseline bootstrap is a one-time nudge for a static self-reported flag, so it
      // dedupes against ANY past send, not just the last 7 days — otherwise it would repeat every
      // run for as long as the student keeps not taking a quiz in that subject.
      if (!g.bootstrap) recentQuery = recentQuery.gte('created_at', sevenDaysAgo);
      const { data: recent } = await recentQuery.limit(1);
      if (recent && recent.length > 0) continue;

      await createNotificationIfEnabled(supabase, 'weakSubjectAlerts', {
        user_id: g.userId,
        type: 'REMINDER',
        title: 'Focus Area Identified',
        message: g.bootstrap
          ? `You told us ${subject.name} needs work — start with a focused practice session this week.`
          : `Your performance in ${subject.name} needs attention. Add extra practice this week.`,
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
