'use client';

import { useState } from 'react';
import { ArrowLeft, Rocket, Type, Calculator, Sparkles as SparklesIcon } from 'lucide-react';
import { LetterMatchGame } from './LetterMatchGame';
import { CountAndTapGame } from './CountAndTapGame';
import { SimpleMathGame } from './SimpleMathGame';
import { SpellingPopGame } from './SpellingPopGame';

const GAMES = [
  { key: 'letters', title: 'Letter Match', emoji: '🔤', color: 'from-violet-400 to-fuchsia-500', Icon: Type, Component: LetterMatchGame },
  { key: 'counting', title: 'Count & Tap', emoji: '🔢', color: 'from-sky-400 to-cyan-500', Icon: Calculator, Component: CountAndTapGame },
  { key: 'math', title: 'Simple Math', emoji: '➕', color: 'from-emerald-400 to-teal-500', Icon: Calculator, Component: SimpleMathGame },
  { key: 'spelling', title: 'Spelling Pop', emoji: '📖', color: 'from-fuchsia-400 to-pink-500', Icon: Type, Component: SpellingPopGame },
] as const;

/**
 * Distinct visual style from the main app on purpose (Part 4.3): brighter, larger touch targets,
 * simpler navigation — a young student never sees the regular study-app chrome here.
 */
export function KidsZoneShell({ studentName }: { studentName: string }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const active = GAMES.find((game) => game.key === activeKey) || null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-violet-50 to-amber-50 dark:from-sky-950 dark:via-violet-950 dark:to-amber-950">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {active ? (
          <div>
            <button
              type="button"
              onClick={() => setActiveKey(null)}
              className="mb-4 flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-violet-700 shadow-md dark:bg-white/10 dark:text-violet-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Kids Zone
            </button>
            <div className="rounded-[2.5rem] bg-white/80 p-6 shadow-xl dark:bg-white/5">
              <active.Component />
            </div>
          </div>
        ) : (
          <>
            <header className="mb-8 text-center">
              <p className="text-5xl">🚀🌟🎈</p>
              <h1 className="mt-2 text-3xl font-black text-violet-700 dark:text-violet-200">
                Hi {studentName}! Ready to play?
              </h1>
              <p className="mt-1 text-lg font-semibold text-violet-500/80 dark:text-violet-300/70">
                Pick a game and have fun learning!
              </p>
            </header>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {GAMES.map((game) => (
                <button
                  key={game.key}
                  type="button"
                  onClick={() => setActiveKey(game.key)}
                  className={`group flex items-center gap-4 rounded-[2rem] bg-gradient-to-br p-6 text-left shadow-xl transition active:scale-95 ${game.color}`}
                >
                  <span className="text-5xl">{game.emoji}</span>
                  <span className="flex-1">
                    <span className="block text-xl font-black text-white">{game.title}</span>
                    <span className="flex items-center gap-1 text-sm font-semibold text-white/80">
                      <Rocket className="h-3.5 w-3.5" /> Tap to play
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-violet-500/70 dark:text-violet-300/60">
              <SparklesIcon className="h-4 w-4" /> A special zone just for you!
            </p>
          </>
        )}
      </div>
    </div>
  );
}
