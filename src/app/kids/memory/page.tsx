'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MemoryMatchGame } from '@/components/features/kids/MemoryMatchGame';
import { logKidsActivity } from '@/lib/kids/logActivity';

const THEMES = [
  { key: 'animals', label: 'Animals', emoji: '🐶' },
  { key: 'fruits', label: 'Fruits', emoji: '🍎' },
  { key: 'shapes', label: 'Shapes', emoji: '⭐' },
  { key: 'space', label: 'Space', emoji: '🚀' },
  { key: 'ocean', label: 'Ocean', emoji: '🐠' },
];

export default function KidsMemoryPage() {
  const [theme, setTheme] = useState('animals');
  const router = useRouter();

  const handleCorrect = () => {
    logKidsActivity('memory', theme, 3).then((result) => {
      if (result) router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-violet-700 dark:text-violet-200">Memory Games 🧠</h1>
        <p className="text-sm font-semibold text-violet-500/80 dark:text-violet-300/70">Flip the cards and find the pairs!</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {THEMES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTheme(t.key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black transition ${
              theme === t.key ? 'bg-violet-600 text-white shadow-md' : 'bg-white/70 text-violet-700/80 dark:bg-white/10 dark:text-violet-200/80'
            }`}
          >
            <span>{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-[2rem] bg-white/80 p-4 shadow-xl dark:bg-white/5">
        <MemoryMatchGame key={theme} theme={theme} onCorrect={handleCorrect} />
      </div>
    </div>
  );
}
