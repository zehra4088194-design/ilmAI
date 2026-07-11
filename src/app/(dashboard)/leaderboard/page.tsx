import { Metadata } from 'next';
import Link from 'next/link';
import { Flame, Shield, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWeekStart } from '@/lib/gamification/week';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = { title: 'Leaderboard' };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ friends?: string }> }) {
  const params = await searchParams;
  const friendsOnly = params.friends === '1';
  const supabase = await createClient();
  const db = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  const weekStart = getCurrentWeekStart();
  const { data: mine } = await db
    .from('league_memberships')
    .select('tier')
    .eq('user_id', user!.id)
    .eq('week_start_date', weekStart)
    .maybeSingle();
  const tier = mine?.tier || 'bronze';

  const friendIds = new Set<string>([user!.id]);
  if (friendsOnly) {
    const { data: requests } = await db
      .from('student_chat_requests')
      .select('requester_id, recipient_id')
      .eq('status', 'approved')
      .or(`requester_id.eq.${user!.id},recipient_id.eq.${user!.id}`);
    for (const request of requests || []) {
      friendIds.add(request.requester_id === user!.id ? request.recipient_id : request.requester_id);
    }
  }

  let leagueQuery = db
    .from('league_memberships')
    .select('user_id, tier, weekly_xp')
    .eq('week_start_date', weekStart)
    .eq('tier', tier)
    .order('weekly_xp', { ascending: false })
    .limit(80);
  if (friendsOnly) leagueQuery = leagueQuery.in('user_id', [...friendIds]);
  const { data: standings } = await leagueQuery;
  const userIds = (standings || []).map((row: any) => row.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name, avatar_url, board, streak, level').in('id', userIds)
    : { data: [] as any[] };
  const profileMap = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
  const zoneSize = Math.max(1, Math.ceil((standings?.length || 0) * 0.1));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-violet-400"><Shield className="h-4 w-4" /> {tier} league</p>
          <h1 className="mt-1 text-2xl font-bold">Weekly Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Top 10% promote, bottom 10% move down next week.</p>
        </div>
        <Link href={friendsOnly ? '/leaderboard' : '/leaderboard?friends=1'} className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium">
          <Users className="h-4 w-4" />
          {friendsOnly ? 'All league' : 'Friends only'}
        </Link>
      </div>

      <div className="space-y-2">
        {(standings || []).map((row: any, index: number) => {
          const profile = profileMap.get(row.user_id);
          const promotion = index < zoneSize;
          const relegation = index >= (standings?.length || 0) - zoneSize;
          return (
            <div
              key={row.user_id}
              className={cn(
                'glass flex items-center gap-3 rounded-xl p-3',
                row.user_id === user!.id && 'border border-violet-500/60',
                promotion && 'ring-1 ring-green-500/40',
                relegation && !promotion && 'ring-1 ring-red-500/35'
              )}
            >
              <span className="w-8 text-center text-sm font-bold">{index + 1}</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white">
                {profile?.full_name?.[0] || 'S'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{profile?.full_name || 'Student'}</p>
                <p className="text-xs text-muted-foreground">{promotion ? 'Promotion zone' : relegation ? 'Relegation zone' : profile?.board || 'League member'}</p>
              </div>
              {profile?.streak > 0 && <span className="flex items-center gap-1 text-xs text-orange-400"><Flame className="h-3.5 w-3.5" />{profile.streak}</span>}
              <span className="text-sm font-bold text-violet-400">{row.weekly_xp} XP</span>
            </div>
          );
        })}
        {!standings?.length && <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No league activity yet this week.</p>}
      </div>
    </div>
  );
}
