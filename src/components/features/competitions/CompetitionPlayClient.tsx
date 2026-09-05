'use client';

// Thin wrapper around the existing QuizEngine — reused exactly as-is (same store, same timer, same
// answer UI). This only (1) fetches the competition/championship's randomized question set and
// seeds it into the same sessionStorage slot practice/mcq already use, and (2) watches the shared
// quiz store for completion so it can report the result back without touching QuizEngine itself.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { QuizEngine } from '@/components/features/quiz/QuizEngine';
import { useQuizStore } from '@/store/quiz.store';

export function CompetitionPlayClient({
  startUrl,
  completeUrl,
  redirectUrl,
}: {
  startUrl: string;
  completeUrl: string;
  redirectUrl: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const postedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        sessionStorage.removeItem('current-quiz');
        const res = await fetch(startUrl, { method: 'POST' });
        const json = await res.json();
        if (cancelled) return;
        if (json.status === 'error') {
          setError(json.error);
          return;
        }
        sessionStorage.setItem('current-quiz', JSON.stringify(json.data.session));
        setReady(true);
      } catch {
        if (!cancelled) setError('Could not start — check your connection and try again.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startUrl]);

  useEffect(() => {
    const unsubscribe = useQuizStore.subscribe((state) => {
      const session = state.session;
      if (session?.status === 'COMPLETED' && !postedRef.current) {
        postedRef.current = true;
        fetch(completeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: session.score, correctCount: session.correctCount, timeSpent: session.timeSpent }),
        })
          .catch(() => {})
          .finally(() => router.push(redirectUrl));
      }
    });
    return unsubscribe;
  }, [completeUrl, redirectUrl, router]);

  if (error) {
    return (
      <div className="border-destructive/40 bg-destructive/5 flex flex-col items-center gap-3 rounded-xl border p-8 text-center">
        <AlertCircle className="text-destructive h-8 w-8" />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-3 py-16 text-center text-sm">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        Shuffling your questions...
      </div>
    );
  }
  return <QuizEngine />;
}
