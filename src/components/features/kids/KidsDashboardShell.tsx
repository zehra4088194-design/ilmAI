'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flame, Sparkles as SparklesIcon, Star, Trophy } from 'lucide-react';
import { LetterMatchGame } from '@/components/features/school-erp/kids-zone/LetterMatchGame';
import { CountAndTapGame } from '@/components/features/school-erp/kids-zone/CountAndTapGame';
import { SimpleMathGame } from '@/components/features/school-erp/kids-zone/SimpleMathGame';
import { SpellingPopGame } from '@/components/features/school-erp/kids-zone/SpellingPopGame';

const GAMES = [
  { key: 'letters', title: 'Letter Match', emoji: '🔤', color: 'from-violet-400 to-fuchsia-500', Component: LetterMatchGame },
  { key: 'counting', title: 'Count & Tap', emoji: '🔢', color: 'from-sky-400 to-cyan-500', Component: CountAndTapGame },
  { key: 'math', title: 'Simple Math', emoji: '➕', color: 'from-emerald-400 to-teal-500', Component: SimpleMathGame },
  { key: 'spelling', title: 'Spelling Pop', emoji: '📖', color: 'from-fuchsia-400 to-pink-500', Component: SpellingPopGame },
] as const;

const FLOATERS = ['🎈', '⭐', '🌈', '🚀', '🎨'];

/**
 * The full landing home for under-8 accounts (resolveMembershipRedirect routes
 * eligible users here instead of /dashboard) — deliberately a real dashboard, not
 * just a game picker: greeting, a playful XP/streak strip, and the games grid, all
 * in a distinct visual language (bright gradients, big rounded shapes, floating
 * emoji, spring animations) with zero shared chrome from the regular app (no
 * sidebar, no study-app navigation) so a young child never has to parse adult UI.
 */
export function KidsDashboardShell({ studentName, xp, streak }: { studentName: string; xp: number; streak: number }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const active = GAMES.find((game) => game.key === activeKey) || null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-100 via-violet-50 to-amber-50 dark:from-sky-950 dark:via-violet-950 dark:to-amber-950">
      {FLOATERS.map((emoji, index) => (
        <motion.span
          key={emoji}
          className="pointer-events-none absolute text-4xl opacity-40 select-none"
          style={{ left: `${8 + index * 20}%`, top: `${10 + (index % 3) * 22}%` }}
          animate={{ y: [0, -16, 0], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 4 + index, repeat: Infinity, ease: 'easeInOut' }}
        >
          {emoji}
        </motion.span>
      ))}

      <div className="relative mx-auto max-w-3xl px-4 py-8">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div key="game" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
              <button
                type="button"
                onClick={() => setActiveKey(null)}
                className="mb-4 flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-violet-700 shadow-md dark:bg-white/10 dark:text-violet-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to my dashboard
              </button>
              <div className="rounded-[2.5rem] bg-white/80 p-6 shadow-xl dark:bg-white/5">
                <active.Component />
              </div>
            </motion.div>
          ) : (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <motion.header
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                className="text-center"
              >
                <p className="text-5xl">🚀🌟🎈</p>
                <h1 className="mt-2 text-3xl font-black text-violet-700 dark:text-violet-200">Hi {studentName}!</h1>
                <p className="mt-1 text-lg font-semibold text-violet-500/80 dark:text-violet-300/70">
                  Ready for some fun and learning?
                </p>
              </motion.header>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.05 }}
                  className="flex items-center gap-3 rounded-[1.75rem] bg-white/85 p-4 shadow-lg dark:bg-white/10"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400/90 text-white">
                    <Star className="h-6 w-6" />
                  </span>
                  <span>
                    <span className="block text-xl font-black text-amber-600 dark:text-amber-300">{xp}</span>
                    <span className="text-xs font-bold text-amber-700/70 dark:text-amber-200/60">Stars earned</span>
                  </span>
                </motion.div>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-3 rounded-[1.75rem] bg-white/85 p-4 shadow-lg dark:bg-white/10"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-400/90 text-white">
                    <Flame className="h-6 w-6" />
                  </span>
                  <span>
                    <span className="block text-xl font-black text-orange-600 dark:text-orange-300">{streak}</span>
                    <span className="text-xs font-bold text-orange-700/70 dark:text-orange-200/60">Day streak</span>
                  </span>
                </motion.div>
              </div>

              <div>
                <p className="mb-3 flex items-center gap-1.5 text-sm font-black text-violet-600 dark:text-violet-300">
                  <Trophy className="h-4 w-4" /> Pick a game
                </p>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {GAMES.map((game, index) => (
                    <motion.button
                      key={game.key}
                      type="button"
                      initial={{ y: 16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.05 * index, type: 'spring', stiffness: 220, damping: 16 }}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.03 }}
                      onClick={() => setActiveKey(game.key)}
                      className={`group flex items-center gap-4 rounded-[2rem] bg-gradient-to-br p-6 text-left shadow-xl ${game.color}`}
                    >
                      <span className="text-5xl">{game.emoji}</span>
                      <span className="flex-1">
                        <span className="block text-xl font-black text-white">{game.title}</span>
                        <span className="text-sm font-semibold text-white/80">Tap to play</span>
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <Link href="/class-library" className="block">
                <motion.div
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25, type: 'spring', stiffness: 220, damping: 16 }}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-4 rounded-[2rem] bg-gradient-to-br from-indigo-400 to-blue-500 p-5 text-left shadow-xl"
                >
                  <span className="text-4xl">📚</span>
                  <span className="flex-1">
                    <span className="block text-lg font-black text-white">My Class Library</span>
                    <span className="text-sm font-semibold text-white/80">Books, videos, and MCQs for your class</span>
                  </span>
                </motion.div>
              </Link>

              <p className="flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-violet-500/70 dark:text-violet-300/60">
                <SparklesIcon className="h-4 w-4" /> A special zone just for you!
              </p>

              <p className="text-center">
                <Link href="/dashboard" className="text-violet-500/60 text-xs underline hover:text-violet-600 dark:text-violet-300/50">
                  I&apos;m not a kid — switch to the full app
                </Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
