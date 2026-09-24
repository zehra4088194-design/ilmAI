'use client';

import { useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { logKidsActivity } from '@/lib/kids/logActivity';

interface GameTab {
  key: string;
  label: string;
  emoji: string;
  Component: ComponentType<{ onCorrect?: () => void }>;
  category: string;
  xp: number;
}

/**
 * Shared shell for kids sections that host one or more of the existing kids-zone
 * mini-games (English, Maths, Urdu) — a segmented tab switcher plus the active game,
 * wired so every correct answer logs XP via logKidsActivity/awardXp instead of just
 * incrementing local score like the old kids-zone screens did.
 */
export function GameTabsSection({ title, subtitle, tabs }: { title: string; subtitle: string; tabs: GameTab[] }) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const router = useRouter();
  const active = tabs.find((tab) => tab.key === activeKey) || tabs[0];

  const handleCorrect = () => {
    if (!active) return;
    logKidsActivity(active.category, active.key, active.xp).then((result) => {
      if (result) router.refresh();
    });
  };

  if (!active) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-violet-700 dark:text-violet-200">{title}</h1>
        <p className="text-sm font-semibold text-violet-500/80 dark:text-violet-300/70">{subtitle}</p>
      </div>

      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveKey(tab.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black transition ${
                tab.key === activeKey
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-white/70 text-violet-700/80 dark:bg-white/10 dark:text-violet-200/80'
              }`}
            >
              <span>{tab.emoji}</span> {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-[2rem] bg-white/80 p-4 shadow-xl dark:bg-white/5">
        <active.Component onCorrect={handleCorrect} />
      </div>
    </div>
  );
}
