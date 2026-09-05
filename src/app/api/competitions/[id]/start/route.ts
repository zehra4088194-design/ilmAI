import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { competitionStatus } from '@/lib/competitions/types';
import { startCompetitionAttempt } from '@/lib/competitions/attempt';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required.' }, { status: 401 });
  const db = supabase as any;

  const { data: competition } = await db.from('competitions').select('*').eq('id', id).maybeSingle();
  if (!competition) return NextResponse.json({ status: 'error', error: 'Competition not found.' }, { status: 404 });
  const status = competitionStatus(competition);
  if (status !== 'active') {
    return NextResponse.json({ status: 'error', error: status === 'upcoming' ? 'This competition has not started yet.' : 'This competition has ended.' }, { status: 409 });
  }

  const { data: existingEntry } = await db
    .from('competition_entries')
    .select('id, completed_at')
    .eq('competition_id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingEntry?.completed_at) {
    return NextResponse.json({ status: 'error', error: 'You have already completed this competition.' }, { status: 409 });
  }
  if (!existingEntry) {
    const { error } = await db.from('competition_entries').insert({ competition_id: id, user_id: user.id });
    if (error) return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }

  const session = startCompetitionAttempt(competition.quiz_session_template, user.id);
  return NextResponse.json({
    status: 'success',
    data: { session, timeLimitSeconds: competition.time_limit_seconds, competitionTitle: competition.title },
  });
}
