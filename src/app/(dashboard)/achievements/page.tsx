import { Metadata } from 'next';
import { Lock, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWeekStart } from '@/lib/gamification/week';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = { title: 'Achievements' };

export default async function AchievementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: profile }, { data: achievements }, { data: earned }, { data: league }, { data: coins }, { count: bossWins }] = await Promise.all([
    supabase.from('profiles').select('xp, streak, coins').eq('id', user!.id).single(),
    supabase.from('achievements').select('id, name, description, icon_url, xp_reward, condition_type, condition_value').order('condition_value'),
    supabase.from('user_achievements').select('achievement_id, earned_at').eq('user_id', user!.id),
    supabase.from('league_memberships' as any).select('weekly_xp').eq('user_id', user!.id).eq('week_start_date', getCurrentWeekStart()).maybeSingle(),
    supabase.from('coin_transactions' as any).select('amount').eq('user_id', user!.id).gt('amount', 0),
    supabase.from('boss_quiz_attempts' as any).select('id', { count: 'exact', head: true }).eq('user_id', user!.id).gte('score', 80),
  ]);

  const earnedIds = new Set((earned || []).map((row) => row.achievement_id));
  const stats: Record<string, number> = {
    streak_days: profile?.streak || 0,
    xp_total: profile?.xp || 0,
    xp: profile?.xp || 0,
    weekly_xp: (league as any)?.weekly_xp || 0,
    coins_earned: (coins || []).reduce((sum: number, row: any) => sum + Math.max(0, row.amount || 0), 0),
    boss_quiz_wins: bossWins || 0,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-violet-400">Gamification</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Achievements</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(achievements || []).map((achievement) => {
          const done = earnedIds.has(achievement.id);
          const current = stats[achievement.condition_type] || 0;
          const progress = Math.min(100, Math.round((current / Math.max(1, achievement.condition_value)) * 100));
          return (
            <div key={achievement.id} className={cn('glass rounded-xl p-5', !done && 'opacity-70 grayscale')}>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-3xl">{achievement.icon_url || '🏆'}</span>
                {done ? <Trophy className="h-5 w-5 text-amber-400" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
              </div>
              <h2 className="font-bold">{achievement.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{achievement.description}</p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs">
                  <span>{Math.min(current, achievement.condition_value)}/{achievement.condition_value}</span>
                  <span>+{achievement.xp_reward} XP</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
