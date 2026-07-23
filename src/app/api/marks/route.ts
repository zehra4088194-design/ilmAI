import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';

interface MarkInput {
  subjectId: string;
  marksObtained: number;
  marksTotal?: number;
}

// Saves optional previous-class marks entered at signup (or later from
// Settings). Never blocks the caller — if the weak-subject notification
// step fails for any reason, the marks are still saved.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const marks: MarkInput[] = Array.isArray(body?.marks) ? body.marks : [];

    const rows = marks
      .filter((m) => m?.subjectId && typeof m.marksObtained === 'number' && !Number.isNaN(m.marksObtained))
      .map((m) => ({
        student_id: user.id,
        subject_id: m.subjectId,
        marks_obtained: m.marksObtained,
        marks_total: m.marksTotal ?? 100,
      }));

    if (rows.length === 0) {
      // Nothing entered — this is a fully valid, expected case (marks are optional).
      return NextResponse.json({ status: 'success', message: 'No marks were provided.' });
    }

    const { error: insertError } = await supabase
      .from('previous_marks')
      .upsert(rows, { onConflict: 'student_id,subject_id' });
    if (insertError) throw insertError;

    // Best-effort: flag the weakest 1-2 subjects with a notification.
    try {
      const ranked = rows
        .map((r) => ({ ...r, ratio: r.marks_obtained / (r.marks_total || 100) }))
        .filter((r) => r.ratio < 0.6)
        .sort((a, b) => a.ratio - b.ratio)
        .slice(0, 2);

      if (ranked.length > 0) {
        const admin = await createAdminClient();
        const { data: subjects } = await admin
          .from('subjects')
          .select('id, name, slug')
          .in(
            'id',
            ranked.map((r) => r.subject_id)
          );

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        for (const r of ranked) {
          const subject = subjects?.find((s) => s.id === r.subject_id);
          if (!subject) continue;

          const linkUrl = `/practice?subject=${subject.slug}`;

          // Rate-limit: skip if we already nudged this subject in the last 7 days.
          const { data: recent } = await admin
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('link', linkUrl)
            .gte('created_at', sevenDaysAgo)
            .limit(1);
          if (recent && recent.length > 0) continue;

          await createNotificationIfEnabled(admin, 'weakSubjectAlerts', {
            user_id: user.id,
            type: 'REMINDER',
            title: 'Focus Area Mili!',
            message: `Your performance in ${subject.name} needs attention. Add extra practice this week.`,
            link: linkUrl,
          });
        }
      }
    } catch (notifyError) {
      console.error('Weak subject notification (signup marks) error:', notifyError);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Save marks error:', error);
    return NextResponse.json({ status: 'error', error: 'Marks could not be saved.' }, { status: 500 });
  }
}
