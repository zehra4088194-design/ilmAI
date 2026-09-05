'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Flame, Sparkles, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { KIDS_NAV } from './kidsNav';

/**
 * Persistent shell for every /kids/* page — top bar (name + Star/Streak pills + switch
 * to full app) and a nav (bottom pill-bar on mobile, left rail on desktop) covering
 * exactly the requested kids sections, nothing else. Zero shared chrome with the main
 * app's DashboardShell, matching the original KidsDashboardShell's visual language
 * (bright gradients, big rounded shapes, floating emoji) but now multi-route.
 */
export function KidsShell({
  studentName,
  xp,
  streak,
  children,
}: {
  studentName: string;
  xp: number;
  streak: number;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-sky-100 via-violet-50 to-amber-50 dark:from-sky-950 dark:via-violet-950 dark:to-amber-950">
      <div className="mx-auto flex min-h-screen max-w-6xl">
        {/* Desktop left rail */}
        <nav className="sticky top-0 hidden h-screen w-44 shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/40 p-3 lg:flex dark:border-white/10">
          {KIDS_NAV.map((item) => {
            const active = item.href === '/kids' ? pathname === '/kids' : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
                  active
                    ? 'bg-violet-600 text-white shadow-lg'
                    : 'text-violet-700/80 hover:bg-white/70 dark:text-violet-200/80 dark:hover:bg-white/10'
                }`}
              >
                <span className="text-xl">{item.emoji}</span> {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 px-4 pt-5 pb-24 lg:pb-8">
          {/* Top bar */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-black text-violet-700 dark:text-violet-200">Hi {studentName}! 👋</p>
              <Link
                href="/dashboard"
                className="text-xs text-violet-500/60 underline hover:text-violet-600 dark:text-violet-300/50"
              >
                I&apos;m not a kid — switch to the full app
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <motion.span
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 shadow-md dark:bg-white/10"
              >
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-black text-amber-600 dark:text-amber-300">{xp}</span>
              </motion.span>
              <motion.span
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 shadow-md dark:bg-white/10"
              >
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-black text-orange-600 dark:text-orange-300">{streak}</span>
              </motion.span>
            </div>
          </div>

          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {children}
          </motion.div>

          <p className="mt-8 hidden items-center justify-center gap-1.5 text-center text-sm font-semibold text-violet-500/70 lg:flex dark:text-violet-300/60">
            <Sparkles className="h-4 w-4" /> A special zone just for you!
          </p>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-1 overflow-x-auto border-t border-white/40 bg-white/90 px-2 py-2 backdrop-blur lg:hidden dark:border-white/10 dark:bg-slate-900/90">
        {KIDS_NAV.map((item) => {
          const active = item.href === '/kids' ? pathname === '/kids' : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-bold ${
                active ? 'bg-violet-600 text-white' : 'text-violet-700/70 dark:text-violet-200/70'
              }`}
            >
              <span className="text-lg">{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
