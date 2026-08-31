'use client';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { QuizSession } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { HouseAdBanner } from '@/components/features/ads/HouseAdBanner';

export function QuizResult({ session, onRetry }: { session: QuizSession; onRetry: () => void }) {
  const updateUser = useAuthStore((state) => state.updateUser);
  const hasAwardedXp = useRef(false);
  const total = session.questions.length;
  const score = session.score || 0;
  const isGood = score >= 70;

  useEffect(() => {
    if (hasAwardedXp.current || session.correctCount <= 0) return;
    hasAwardedXp.current = true;

    fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: session.correctCount }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.status === 'success' && json.data?.awarded > 0) {
          updateUser({ xp: json.data.xp, level: json.data.level });
          toast.success(`+${json.data.awarded} XP`);
        }
      })
      .catch(() => {});
  }, [session.correctCount, updateUser]);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
      <div
        className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${isGood ? 'bg-green-500/10' : 'bg-amber-500/10'}`}
      >
        <Trophy className={`h-10 w-10 ${isGood ? 'text-green-500' : 'text-amber-500'}`} />
      </div>
      <h2 className="mb-2 text-3xl font-bold">{score}%</h2>
      <p className="text-muted-foreground mb-8">{isGood ? 'Excellent work!' : 'Good attempt. Keep practising.'}</p>
      <div className="mx-auto mb-8 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-500">{session.correctCount}</p>
            <p className="text-muted-foreground text-xs">Correct</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-500">{session.incorrectCount}</p>
            <p className="text-muted-foreground text-xs">Wrong</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-muted-foreground text-xs">Total</p>
          </CardContent>
        </Card>
      </div>
      <HouseAdBanner slot="quiz_results" className="mx-auto mb-6 max-w-md" />
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
        <Button asChild variant="gradient">
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
