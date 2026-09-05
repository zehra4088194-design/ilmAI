import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Flame, Lock, Star, Trophy } from 'lucide-react';

export const metadata = { title: 'Rewards | ilm AI Kids' };

// Kid-styled reuse of the same achievements/user_achievements query pattern as
// src/components/features/progress/AchievementsList/index.tsx — same tables, bigger
// and more colorful for the kids app.
export default async function KidsRewardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fkids%2Frewards');

  const [{ data: profile }, { data: achievements }, { data: earned }] = await Promise.all([
    supabase.from('profiles').select('xp, streak, coins').eq('id', user.id).maybeSingle(),
    supabase.from('achievements').select('id, name, description, icon_url').order('condition_value', { ascending: true }),
    supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id),
  ]);

  const earnedIds = new Set((earned || []).map((row) => row.achievement_id));
  const list = achievements || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-violet-700 dark:text-violet-200">Rewards / Achievement Room 🏆</h1>
        <p className="text-sm font-semibold text-violet-500/80 dark:text-violet-300/70">Look at everything you&apos;ve earned!</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-[1.75rem] bg-gradient-to-br from-amber-400 to-yellow-500 p-4 text-center shadow-lg">
          <Star className="h-6 w-6 text-white" />
          <span className="text-xl font-black text-white">{profile?.xp || 0}</span>
          <span className="text-[10px] font-bold text-white/80">Stars</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-[1.75rem] bg-gradient-to-br from-orange-400 to-red-500 p-4 text-center shadow-lg">
          <Flame className="h-6 w-6 text-white" />
          <span className="text-xl font-black text-white">{profile?.streak || 0}</span>
          <span className="text-[10px] font-bold text-white/80">Day Streak</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-[1.75rem] bg-gradient-to-br from-emerald-400 to-teal-500 p-4 text-center shadow-lg">
          <Trophy className="h-6 w-6 text-white" />
          <span className="text-xl font-black text-white">{earnedIds.size}</span>
          <span className="text-[10px] font-bold text-white/80">Badges</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {list.map((achievement) => {
          const isEarned = earnedIds.has(achievement.id);
          return (
            <div
              key={achievement.id}
              className={`flex flex-col items-center gap-2 rounded-[1.75rem] p-4 text-center shadow-lg ${
                isEarned ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-white/60 opacity-60 dark:bg-white/5'
              }`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/25">
                {isEarned ? <Trophy className="h-6 w-6 text-white" /> : <Lock className="text-muted-foreground h-5 w-5" />}
              </span>
              <span className={`text-xs font-black ${isEarned ? 'text-white' : ''}`}>{achievement.name}</span>
              <span className={`text-[10px] ${isEarned ? 'text-white/85' : 'text-muted-foreground'}`}>{achievement.description}</span>
            </div>
          );
        })}
        {list.length === 0 && <p className="text-muted-foreground col-span-full text-center text-sm">No badges set up yet.</p>}
      </div>
    </div>
  );
}
