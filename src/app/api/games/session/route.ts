import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';

const DAY_SECONDS = 24 * 60 * 60;

function todayStartIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function secondsBetween(start: string, end?: string | null) {
  const finish = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, Math.floor((finish - new Date(start).getTime()) / 1000));
}

async function getUserContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle();
  return { supabase, user, profile };
}

async function getTodayUsage(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await (supabase.from('game_sessions' as any) as any)
    .select('id, started_at, ended_at, duration_seconds')
    .eq('user_id', userId)
    .gte('started_at', todayStartIso());

  return ((data || []) as Array<{ started_at: string; ended_at: string | null; duration_seconds: number | null }>).reduce((sum, session) => {
    const persisted = Number(session.duration_seconds || 0);
    return sum + Math.max(persisted, secondsBetween(session.started_at, session.ended_at));
  }, 0);
}

async function getLimit(tier: SubscriptionTier) {
  const settings = await getPlatformSettings();
  const plan = getPlanFromSettings(settings, tier);
  return {
    canPlay: plan.access.games,
    limitSeconds: Math.max(0, Number(plan.limits.gameMinutesDaily || 0) * 60),
  };
}

export async function GET() {
  const { supabase, user, profile } = await getUserContext();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tier = (profile.subscription_tier || 'FREE') as SubscriptionTier;
  const { canPlay, limitSeconds } = await getLimit(tier);
  const usedSeconds = await getTodayUsage(supabase, user.id);

  return NextResponse.json({
    tier,
    canPlay,
    usedSeconds,
    limitSeconds,
    remainingSeconds: Math.max(0, limitSeconds - usedSeconds),
  });
}

export async function POST(req: NextRequest) {
  const { supabase, user, profile } = await getUserContext();
  if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tier = (profile.subscription_tier || 'FREE') as SubscriptionTier;
  const { canPlay, limitSeconds } = await getLimit(tier);
  if (!canPlay || limitSeconds <= 0) {
    return NextResponse.json({ error: 'Live games are available on Pro and Elite.' }, { status: 402 });
  }

  const usedSeconds = await getTodayUsage(supabase, user.id);
  if (usedSeconds >= limitSeconds) {
    return NextResponse.json(
      { error: "Today's 45-minute game and rest limit has been reached. Return to your study plan." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const gameId = body.gameId || null;
  const roomCode = String(body.roomCode || '').trim().toUpperCase().slice(0, 16) || null;

  const { data, error } = await (supabase.from('game_sessions' as any) as any)
    .insert({
      user_id: user.id,
      game_id: gameId,
      room_code: roomCode,
    })
    .select('id, started_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    session: data,
    usedSeconds,
    limitSeconds,
    remainingSeconds: Math.max(0, limitSeconds - usedSeconds),
  });
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getUserContext();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId || '');
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const { data: session } = await (supabase.from('game_sessions' as any) as any)
    .select('id, started_at')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const duration = Math.min(DAY_SECONDS, secondsBetween(session.started_at));
  const { error } = await (supabase.from('game_sessions' as any) as any)
    .update({
      last_heartbeat_at: new Date().toISOString(),
      ended_at: body.end ? new Date().toISOString() : null,
      duration_seconds: duration,
    })
    .eq('id', sessionId)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, durationSeconds: duration });
}
