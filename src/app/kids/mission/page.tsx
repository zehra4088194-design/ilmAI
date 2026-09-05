import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TodaysLearningStrip } from '@/components/features/kids/TodaysLearningStrip';
import { MissionCheckIn } from '@/components/features/kids/MissionCheckIn';
import { computeDailyMissionStatus } from '@/lib/kids/dailyMission';

export const metadata = { title: 'Daily Learning Mission | ilm AI Kids' };

export default async function KidsMissionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fkids%2Fmission');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todayLog } = await supabase
    .from('kids_activity_log')
    .select('category')
    .eq('user_id', user.id)
    .gte('created_at', todayStart.toISOString());

  const { missionDone, englishDone, mathsDone, quranDone, gameDone, rewardDone, allFiveDone, doneCount } =
    computeDailyMissionStatus((todayLog || []).map((row) => row.category));
  const missionStarted = missionDone;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-violet-700 dark:text-violet-200">Daily Learning Mission 🎯</h1>
        <p className="text-sm font-semibold text-violet-500/80 dark:text-violet-300/70">
          Complete today&apos;s 5 steps to unlock your reward!
        </p>
      </div>

      <div className="rounded-[2rem] bg-white/80 p-5 shadow-xl dark:bg-white/5">
        <div className="mb-3 flex items-center justify-between text-sm font-black text-violet-700 dark:text-violet-200">
          <span>Today&apos;s Progress</span>
          <span>{doneCount} / 5</span>
        </div>
        <div className="bg-muted h-3 w-full overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
            style={{ width: `${(doneCount / 5) * 100}%` }}
          />
        </div>
      </div>

      {!missionStarted && <MissionCheckIn />}

      <TodaysLearningStrip
        steps={[
          { key: 'mission', label: 'Mission', emoji: '🎯', href: '/kids/mission', done: missionDone },
          { key: 'english', label: 'English', emoji: '🔤', href: '/kids/english', done: englishDone },
          { key: 'maths', label: 'Maths', emoji: '🔢', href: '/kids/maths', done: mathsDone },
          { key: 'quran', label: 'Quran', emoji: '📗', href: '/kids/quran', done: quranDone },
          { key: 'game', label: 'Game', emoji: '🧠', href: '/kids/memory', done: gameDone },
        ]}
        rewardDone={rewardDone}
        rewardUnlocked={allFiveDone}
      />
    </div>
  );
}
