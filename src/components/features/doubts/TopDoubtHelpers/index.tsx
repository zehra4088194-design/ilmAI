import { Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

type Helper = { userId: string; fullName: string; avatarUrl: string | null; answersAccepted: number; coinsEarned: number };

/** Phase 3c — mini leaderboard scoped to peer-doubt-answer XP, same visual language as /leaderboard. */
export function TopDoubtHelpers({ helpers, currentUserId }: { helpers: Helper[]; currentUserId: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <Trophy className="h-4 w-4 text-amber-500" /> Top Helpers
        </p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {helpers.map((helper, index) => (
            <div
              key={helper.userId}
              className={cn(
                'flex min-w-[110px] shrink-0 flex-col items-center gap-1 rounded-lg border p-2.5 text-center',
                helper.userId === currentUserId ? 'border-violet-500/60 bg-violet-500/5' : 'border-border'
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white">
                {index === 0 ? '🏆' : helper.fullName?.[0] || '?'}
              </span>
              <span className="w-full truncate text-xs font-medium">{helper.fullName}</span>
              <span className="text-muted-foreground text-[10px]">{helper.answersAccepted} helpful answer{helper.answersAccepted === 1 ? '' : 's'}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
