import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { KIDS_NAV } from '@/components/features/kids/kidsNav';
import { TodaysLearningStrip } from '@/components/features/kids/TodaysLearningStrip';
import { computeDailyMissionStatus } from '@/lib/kids/dailyMission';

export const metadata = { title: "Today's Learning | ilm AI Kids" };

// Gradient per section so the home grid keeps the original colorful-tile look.
const GRID_COLORS: Record<string, string> = {
  mission: 'from-rose-400 to-orange-500',
  english: 'from-violet-400 to-fuchsia-500',
  maths: 'from-emerald-400 to-teal-500',
  urdu: 'from-indigo-400 to-blue-600',
  stories: 'from-amber-400 to-orange-500',
  gk: 'from-sky-400 to-cyan-500',
  islamic: 'from-emerald-500 to-teal-600',
  memory: 'from-fuchsia-400 to-pink-500',
  quiz: 'from-blue-400 to-indigo-500',
  rewards: 'from-yellow-400 to-amber-500',
  challenge: 'from-red-400 to-rose-500',
  'listen-repeat': 'from-cyan-400 to-sky-500',
  quran: 'from-teal-500 to-emerald-600',
};

const GRID_ITEMS = KIDS_NAV.filter((item) => item.key !== 'home').map((item) => ({
  ...item,
  color: GRID_COLORS[item.key] || 'from-violet-400 to-fuchsia-500',
}));

export default async function KidsHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fkids');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todayLog } = await supabase
    .from('kids_activity_log')
    .select('category')
    .eq('user_id', user.id)
    .gte('created_at', todayStart.toISOString());

  const { missionDone, englishDone, mathsDone, quranDone, gameDone, rewardDone, allFiveDone } =
    computeDailyMissionStatus((todayLog || []).map((row) => row.category));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-4xl">🚀🌟🎈</p>
        <h1 className="mt-2 text-2xl font-black text-violet-700 dark:text-violet-200">Today&apos;s Learning</h1>
        <p className="text-sm font-semibold text-violet-500/80 dark:text-violet-300/70">
          Finish all 6 steps to unlock your daily reward!
        </p>
      </div>

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

      <div>
        <p className="mb-3 text-sm font-black text-violet-600 dark:text-violet-300">Explore everything</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {GRID_ITEMS.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center gap-2 rounded-[2rem] bg-gradient-to-br p-5 text-center shadow-xl transition active:scale-95 ${item.color}`}
            >
              <span className="text-4xl">{item.emoji}</span>
              <span className="text-sm font-black text-white">{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
