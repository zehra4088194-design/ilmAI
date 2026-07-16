import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { GamesClient } from '@/components/features/games/GamesClient';
import { DEFAULT_GAMES, type GameCardData } from '@/lib/games/defaultGames';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';

export const metadata: Metadata = { title: 'Games Zone' };

function secondsBetween(start: string, end?: string | null) {
  const finish = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, Math.floor((finish - new Date(start).getTime()) / 1000));
}

export default async function GamesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user!.id).maybeSingle();
  const tier = (profile?.subscription_tier || 'FREE') as SubscriptionTier;
  const settings = await getPlatformSettings();
  const plan = getPlanFromSettings(settings, tier);
  const limitSeconds = Math.max(0, plan.limits.gameMinutesDaily * 60);

  const { data: gameRows } = await (supabase.from('games' as any) as any)
    .select('id, slug, title, description, thumbnail_url, category, game_type, difficulty, featured, min_tier')
    .eq('is_active', true)
    .order('featured', { ascending: false })
    .order('title', { ascending: true });

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data: sessions } = await (supabase.from('game_sessions' as any) as any)
    .select('started_at, ended_at, duration_seconds')
    .eq('user_id', user!.id)
    .gte('started_at', start.toISOString());
  const usedSeconds = ((sessions || []) as Array<{ started_at: string; ended_at: string | null; duration_seconds: number | null }>).reduce(
    (sum, session) => sum + Math.max(Number(session.duration_seconds || 0), secondsBetween(session.started_at, session.ended_at)),
    0,
  );

  return (
    <GamesClient
      games={((gameRows?.length ? gameRows : DEFAULT_GAMES) as GameCardData[])}
      tier={tier}
      canPlay={plan.access.games}
      limitSeconds={limitSeconds}
      remainingSeconds={Math.max(0, limitSeconds - usedSeconds)}
    />
  );
}
