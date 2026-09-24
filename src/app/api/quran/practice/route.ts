import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logKidsActivityServer } from '@/lib/kids/logActivityServer';

/** Student self-report: "I did my reading & practice today" — upserts quran_daily_practice
 * and awards XP through the same kids_activity_log + awardXp pipeline as /api/kids/activity. */
export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const admin = await createAdminClient();

  const { data: existing } = await admin
    .from('quran_daily_practice')
    .select('id, completed')
    .eq('student_id', user.id)
    .eq('practice_date', today)
    .maybeSingle();

  if (existing?.completed) {
    return NextResponse.json({ status: 'success', alreadyDone: true });
  }

  const { error } = await admin
    .from('quran_daily_practice')
    .upsert({ student_id: user.id, practice_date: today, completed: true }, { onConflict: 'student_id,practice_date' });
  if (error) return NextResponse.json({ error: 'Could not save your practice.' }, { status: 500 });

  const result = await logKidsActivityServer(user.id, 'quran', 'daily_practice', 10);

  return NextResponse.json({ status: 'success', xp: result.xp, level: result.level });
}
