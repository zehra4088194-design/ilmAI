'use client';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { QuizSession } from '@/types';

export function QuizResult({ session, onRetry }: { session: QuizSession; onRetry: () => void }) {
  const total = session.questions.length;
  const score = session.score || 0;
  const isGood = score >= 70;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
      <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${isGood ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
        <Trophy className={`w-10 h-10 ${isGood ? 'text-green-500' : 'text-amber-500'}`} />
      </div>
      <h2 className="text-3xl font-bold mb-2">{score}%</h2>
      <p className="text-muted-foreground mb-8">{isGood ? 'Shabash! Bohat acha kiya!' : 'Acha attempt! Aur practice karo.'}</p>
      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-green-500">{session.correctCount}</p><p className="text-xs text-muted-foreground">Correct</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-red-500">{session.incorrectCount}</p><p className="text-xs text-muted-foreground">Wrong</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
      </div>
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onRetry}><RotateCcw className="w-4 h-4" />Try Again</Button>
        <Button asChild variant="gradient"><Link href="/dashboard"><Home className="w-4 h-4" />Dashboard</Link></Button>
      </div>
    </motion.div>
  );
}
