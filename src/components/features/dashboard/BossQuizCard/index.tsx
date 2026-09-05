import Link from 'next/link';
import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BossQuizCard({ bossQuiz }: { bossQuiz: { id: string; xp_reward: number; coin_reward: number } | null }) {
  return (
    <div className="dashboard-surface rounded-xl border border-border/70 p-5 text-foreground shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Crown className="h-5 w-5 text-amber-400" />
        <h2 className="font-bold">This Week&apos;s Boss Quiz</h2>
      </div>
      {bossQuiz ? (
        <>
          <p className="text-sm text-muted-foreground">Win for {bossQuiz.xp_reward} XP and {bossQuiz.coin_reward} coins.</p>
          <Button asChild variant="gradient" className="mt-4 w-full">
            <Link href={`/competitions/subject/${bossQuiz.id}`}>Enter Championship</Link>
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">No weekly boss quiz generated yet. Check the Competition Portal for what's live.</p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link href="/competitions">Competition Portal</Link>
          </Button>
        </>
      )}
    </div>
  );
}
