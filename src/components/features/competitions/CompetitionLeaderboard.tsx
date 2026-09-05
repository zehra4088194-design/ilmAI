'use client';

// Pseudo-live leaderboard: no websocket/Realtime channel, just a cheap ranked read polled every
// few seconds while the competition is still active — same trade-off the rest of the app makes
// (see class_live_chat, which IS on Realtime, vs this, which doesn't need sub-second latency).

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

type LeaderboardRow = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  score: number;
  rank: number;
  percentile: number | null;
  medal: string | null;
  isMe: boolean;
};

export function CompetitionLeaderboard({ competitionId, isActive, initialLeaderboard }: { competitionId: string; isActive: boolean; initialLeaderboard: LeaderboardRow[] }) {
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/competitions/${competitionId}/leaderboard`);
        const json = await res.json();
        if (json.status === 'success') setLeaderboard(json.data.leaderboard);
      } catch {
        // Silent — next poll will retry.
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [competitionId, isActive]);

  if (!leaderboard.length) {
    return <p className="text-muted-foreground py-6 text-center text-sm">No one has finished yet — be the first.</p>;
  }

  return (
    <div className="space-y-2">
      {leaderboard.map((row) => (
        <div
          key={row.userId}
          className={cn(
            'flex items-center gap-3 rounded-lg border p-2.5 text-sm',
            row.isMe ? 'border-violet-500/60 bg-violet-500/5' : 'border-border'
          )}
        >
          <span className="w-7 shrink-0 text-center font-bold">{row.medal || row.rank}</span>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
            {row.fullName[0] || 'S'}
          </div>
          <span className="min-w-0 flex-1 truncate font-medium">{row.fullName}{row.isMe ? ' (You)' : ''}</span>
          {row.percentile != null && <span className="text-muted-foreground hidden shrink-0 text-[11px] sm:inline">Top {Math.round(100 - row.percentile)}%</span>}
          <span className="shrink-0 font-bold text-violet-500">{row.score}%</span>
        </div>
      ))}
    </div>
  );
}
