import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCompetitionDetail } from '@/lib/competitions/queries';

export const runtime = 'nodejs';

// Polled client-side every few seconds while a competition is active — this is the
// "pseudo-live leaderboard" (no websocket infra needed, just a cheap ranked read).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required.' }, { status: 401 });

  const detail = await getCompetitionDetail(supabase as any, id);
  if (!detail) return NextResponse.json({ status: 'error', error: 'Competition not found.' }, { status: 404 });

  const leaderboard = detail.leaderboard
    .filter((entry) => entry.completed_at)
    .map((entry) => ({
      userId: entry.user_id,
      fullName: entry.profile?.full_name || 'Student',
      avatarUrl: entry.profile?.avatar_url || null,
      score: entry.score,
      rank: entry.rank,
      percentile: entry.percentile,
      medal: entry.medal,
      isMe: entry.user_id === user.id,
    }));

  return NextResponse.json({ status: 'success', data: { leaderboard, totalParticipants: leaderboard.length } });
}
