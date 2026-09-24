import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWeekStart } from '@/lib/gamification/week';
import { startCompetitionAttempt } from '@/lib/competitions/attempt';

export const runtime = 'nodejs';

// Subject Championship play flow — boss_quizzes/boss_quiz_attempts already existed (see
// 20260710120500_boss_quizzes_avatars.sql) but nothing ever let a student actually take one; this
// mirrors /api/competitions/[id]/start exactly (same template shape, same randomization).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required.' }, { status: 401 });
  const db = supabase as any;

  const { data: bossQuiz } = await db.from('boss_quizzes').select('*').eq('id', id).maybeSingle();
  if (!bossQuiz) return NextResponse.json({ status: 'error', error: 'Championship not found.' }, { status: 404 });
  if (bossQuiz.week_start_date !== getCurrentWeekStart()) {
    return NextResponse.json({ status: 'error', error: 'This championship is not active this week.' }, { status: 409 });
  }

  const { data: existingAttempt } = await db
    .from('boss_quiz_attempts')
    .select('id, completed_at')
    .eq('boss_quiz_id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingAttempt?.completed_at) {
    return NextResponse.json({ status: 'error', error: 'You have already completed this championship.' }, { status: 409 });
  }
  if (!existingAttempt) {
    const { error } = await db.from('boss_quiz_attempts').insert({ boss_quiz_id: id, user_id: user.id });
    if (error) return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }

  const session = startCompetitionAttempt(bossQuiz.quiz_session_template, user.id);
  return NextResponse.json({ status: 'success', data: { session } });
}
