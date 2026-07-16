import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';

async function requireGameAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, allowed: false, error: 'Unauthorized', status: 401 };

  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).maybeSingle();
  const tier = (profile?.subscription_tier || 'FREE') as SubscriptionTier;
  const settings = await getPlatformSettings();
  const allowed = getPlanFromSettings(settings, tier).access.games;
  return { supabase, user, allowed, error: allowed ? null : 'Live games Pro/Elite feature hain.', status: allowed ? 200 : 402 };
}

export async function GET(req: NextRequest) {
  const { supabase, user, allowed, error, status } = await requireGameAccess();
  if (!user || !allowed) return NextResponse.json({ error }, { status });
  const roomCode = req.nextUrl.searchParams.get('roomCode')?.trim().toUpperCase();
  if (!roomCode) return NextResponse.json({ error: 'roomCode required' }, { status: 400 });

  const { data, error: dbError } = await (supabase.from('game_room_events' as any) as any)
    .select('id, room_code, game_id, user_id, event_type, payload, created_at')
    .eq('room_code', roomCode)
    .order('created_at', { ascending: true })
    .limit(80);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ events: data || [] });
}

export async function POST(req: NextRequest) {
  const { supabase, user, allowed, error, status } = await requireGameAccess();
  if (!user || !allowed) return NextResponse.json({ error }, { status });
  const body = await req.json().catch(() => ({}));
  const roomCode = String(body.roomCode || '').trim().toUpperCase().slice(0, 16);
  const eventType = String(body.eventType || '').trim().slice(0, 40);
  if (!roomCode || !eventType) return NextResponse.json({ error: 'roomCode and eventType required' }, { status: 400 });

  const payload = typeof body.payload === 'object' && body.payload ? body.payload : {};
  const { data, error: dbError } = await (supabase.from('game_room_events' as any) as any)
    .insert({
      room_code: roomCode,
      game_id: body.gameId || null,
      user_id: user.id,
      event_type: eventType,
      payload,
    })
    .select('id, room_code, game_id, user_id, event_type, payload, created_at')
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ event: data });
}
