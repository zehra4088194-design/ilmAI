'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, X, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuth';

const TOUR_VERSION = 'v1';
const NUDGE_VERSION = 'v1';

export function PracticeStartNudge({ featureTourOpen }: { featureTourOpen: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.id || featureTourOpen || typeof window === 'undefined') {
      setVisible(false);
      return;
    }
    if (user.role && user.role !== 'student') return;
    if (user.educationLevel === 'university') return;

    const personalizationOpen =
      user.aiOnboardingComplete === false &&
      user.isProfileComplete === true &&
      Boolean(user.board) &&
      Boolean(user.gradeLevel);
    if (personalizationOpen) {
      setVisible(false);
      return;
    }

    const created = Date.parse(user.createdAt || '');
    const ageDays = Number.isFinite(created) ? (Date.now() - created) / 86_400_000 : Number.POSITIVE_INFINITY;
    if (ageDays > 21) return;

    const tourDone =
      window.localStorage.getItem(`ilm-ai-feature-tour:${TOUR_VERSION}:${user.id}`) === 'completed';
    const nudgeState = window.localStorage.getItem(`ilm-ai-practice-nudge:${NUDGE_VERSION}:${user.id}`);
    const diagnosticDone =
      window.localStorage.getItem(`ilm-ai-diagnostic-done:${NUDGE_VERSION}:${user.id}`) === '1';
    if (!tourDone || nudgeState || diagnosticDone) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), 700);
    return () => window.clearTimeout(timer);
  }, [featureTourOpen, user]);

  if (!visible || !user?.id) return null;

  const remember = (value: string) => {
    window.localStorage.setItem(`ilm-ai-practice-nudge:${NUDGE_VERSION}:${user.id}`, value);
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Dismiss suggestion"
        className="absolute inset-0 bg-black/45"
        onClick={() => remember('later')}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-nudge-title"
        className="bg-background/95 relative w-full max-w-md rounded-2xl border border-white/15 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={() => remember('later')}
          className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-3 right-3 rounded-full p-1.5"
          aria-label="Not now"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 pr-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-violet-400 uppercase">Next step</p>
            <h2 id="practice-nudge-title" className="text-lg leading-tight font-bold">
              Take a short test first
            </h2>
          </div>
        </div>
        <p className="text-muted-foreground mt-4 text-sm leading-6">
          Tour khatam. Ab ek chhota diagnostic test do — uske baad Adaptive Practice tumhare level ke hisaab se
          chapters layegi.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              remember('test');
              router.push('/diagnostic');
            }}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20"
          >
            <ClipboardCheck className="h-4 w-4" />
            Take the test
          </button>
          <button
            type="button"
            onClick={() => {
              remember('practice');
              router.push('/practice');
            }}
            className="border-border hover:bg-muted inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-semibold"
          >
            <Zap className="h-4 w-4" />
            Adaptive Practice
          </button>
        </div>
      </div>
    </div>
  );
}
