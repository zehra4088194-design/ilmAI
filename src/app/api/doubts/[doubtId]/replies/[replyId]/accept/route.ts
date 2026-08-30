import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';
import { awardCoins } from '@/lib/gamification/coins';
import { awardXp } from '@/lib/gamification/xp';
import { COINS_PER_PEER_DOUBT_ANSWER, XP_PER_PEER_DOUBT_ANSWER } from '@/lib/gamification/constants';

/**
 * Phase 3a — the doubt's asker marks a peer answer "helpful". Awards the answering student
 * XP/coins via the existing lib/gamification/xp.ts + coins.ts functions, reason 'peer_doubt_answer'
 * — same functions every other XP/coin-earning feature in this app uses.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ doubtId: string; replyId: string }> }) {
  const { doubtId, replyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const db = supabase as any;
  const { data: doubt } = await db.from('doubts').select('id, student_id').eq('id', doubtId).maybeSingle();
  if (!doubt) return NextResponse.json({ status: 'error', error: 'Question not found.' }, { status: 404 });
  if (doubt.student_id !== user.id) {
    return NextResponse.json({ status: 'error', error: 'Only the person who asked can mark an answer helpful.' }, { status: 403 });
  }

  // doubt_replies has no UPDATE policy for students (RLS-checked above via ownership of the
  // doubt instead) — service role performs the actual write, same as every other
  // asker-triggered-but-cross-user mutation in this app (e.g. awardCoins/awardXp themselves).
  const admin = createServiceClient() as any;
  const { data: reply } = await admin
    .from('doubt_replies')
    .select('id, teacher_id, doubt_id, is_peer_reply, is_accepted, xp_awarded')
    .eq('id', replyId)
    .eq('doubt_id', doubtId)
    .maybeSingle();
  if (!reply || !reply.is_peer_reply) {
    return NextResponse.json({ status: 'error', error: 'That answer could not be found.' }, { status: 404 });
  }
  if (reply.xp_awarded) {
    return NextResponse.json({ status: 'success', data: { alreadyAwarded: true } });
  }
  if (reply.teacher_id === doubt.student_id) {
    return NextResponse.json({ status: 'error', error: 'You cannot mark your own answer helpful.' }, { status: 400 });
  }

  const { error } = await admin.from('doubt_replies').update({ is_accepted: true, xp_awarded: true }).eq('id', replyId);
  if (error) return NextResponse.json({ status: 'error', error: 'Could not mark this answer helpful.' }, { status: 500 });

  await awardXp(reply.teacher_id, XP_PER_PEER_DOUBT_ANSWER, 'peer_doubt_answer');
  await awardCoins(reply.teacher_id, COINS_PER_PEER_DOUBT_ANSWER, 'peer_doubt_answer', replyId);
  await createNotificationIfEnabled(admin, 'achievements', {
    user_id: reply.teacher_id,
    type: 'ACHIEVEMENT',
    title: 'Your answer helped a classmate!',
    message: `+${XP_PER_PEER_DOUBT_ANSWER} XP and +${COINS_PER_PEER_DOUBT_ANSWER} coins for a helpful doubt-board answer.`,
    link: `/doubts?doubtId=${doubtId}`,
    is_read: false,
  }).catch((err) => console.error('Peer answer notification failed:', err));

  return NextResponse.json({ status: 'success', data: { xpAwarded: XP_PER_PEER_DOUBT_ANSWER, coinsAwarded: COINS_PER_PEER_DOUBT_ANSWER } });
}
