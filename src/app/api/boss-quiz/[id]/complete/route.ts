import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { awardXp } from '@/lib/gamification/xp';
import { awardCoins } from '@/lib/gamification/coins';
import { BOSS_QUIZ_WIN_SCORE, COINS_PER_BOSS_QUIZ_WIN } from '@/lib/gamification/constants';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const score = Number(body.score) || 0;

  const db = createServiceClient() as any;
  const { data: bossQuiz } = await db.from('boss_quizzes').select('id, xp_reward, coin_reward').eq('id', id).maybeSingle();
  if (!bossQuiz) return NextResponse.json({ status: 'error', error: 'Championship not found.' }, { status: 404 });

  const { data: attempt } = await db.from('boss_quiz_attempts').select('id, completed_at').eq('boss_quiz_id', id).eq('user_id', user.id).maybeSingle();
  if (!attempt) return NextResponse.json({ status: 'error', error: 'Start the championship before completing it.' }, { status: 409 });
  if (attempt.completed_at) {
    return NextResponse.json({ status: 'success', data: { alreadyCompleted: true, won: score >= BOSS_QUIZ_WIN_SCORE } });
  }

  const { error } = await db.from('boss_quiz_attempts').update({ score, completed_at: new Date().toISOString() }).eq('id', attempt.id);
  if (error) return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });

  const won = score >= BOSS_QUIZ_WIN_SCORE;
  const xpResult = await awardXp(user.id, won ? bossQuiz.xp_reward || 0 : Math.round((bossQuiz.xp_reward || 0) / 3), 'boss_quiz_complete');
  if (won) await awardCoins(user.id, bossQuiz.coin_reward || COINS_PER_BOSS_QUIZ_WIN, 'boss_quiz_win', id);

  return NextResponse.json({ status: 'success', data: { won, xpAwarded: xpResult.awarded } });
}
