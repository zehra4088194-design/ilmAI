import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { awardXp } from '@/lib/gamification/xp';
import { awardCoins } from '@/lib/gamification/coins';
import { recomputeCompetitionLeaderboard } from '@/lib/competitions/scoring';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const quizSessionId = String(body.quizSessionId || '') || null;
  const score = Number(body.score) || 0;
  const correctCount = Number.isFinite(Number(body.correctCount)) ? Number(body.correctCount) : null;
  const timeSpent = Number.isFinite(Number(body.timeSpent)) ? Number(body.timeSpent) : null;

  const db = createServiceClient() as any;
  const { data: competition } = await db.from('competitions').select('id, xp_reward, coin_reward').eq('id', id).maybeSingle();
  if (!competition) return NextResponse.json({ status: 'error', error: 'Competition not found.' }, { status: 404 });

  const { data: entry } = await db.from('competition_entries').select('*').eq('competition_id', id).eq('user_id', user.id).maybeSingle();
  if (!entry) return NextResponse.json({ status: 'error', error: 'Start the competition before completing it.' }, { status: 409 });
  if (entry.completed_at) {
    return NextResponse.json({ status: 'success', data: { rank: entry.rank, percentile: entry.percentile, alreadyCompleted: true } });
  }

  const { error: updateError } = await db
    .from('competition_entries')
    .update({
      quiz_session_id: quizSessionId,
      score,
      correct_count: correctCount,
      time_spent: timeSpent,
      completed_at: new Date().toISOString(),
    })
    .eq('id', entry.id);
  if (updateError) return NextResponse.json({ status: 'error', error: updateError.message }, { status: 500 });

  await recomputeCompetitionLeaderboard(id);
  const [{ data: updatedEntry }, xpResult] = await Promise.all([
    db.from('competition_entries').select('rank, percentile').eq('id', entry.id).maybeSingle(),
    awardXp(user.id, competition.xp_reward || 0, 'competition_complete'),
  ]);
  await awardCoins(user.id, competition.coin_reward || 0, 'competition_complete', id);

  return NextResponse.json({
    status: 'success',
    data: { rank: updatedEntry?.rank ?? null, percentile: updatedEntry?.percentile ?? null, xpAwarded: xpResult.awarded },
  });
}
