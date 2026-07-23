'use client';
import { motion } from 'framer-motion';
import { Crown, Medal, Flame } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatXP } from '@/lib/utils/format';

interface LeaderUser { id: string; full_name: string; avatar_url?: string | null; board?: string | null; xp: number; level: number; streak: number; }

export function LeaderboardTable({ users, currentUserId }: { users: LeaderUser[]; currentUserId: string }) {
  const top3 = users.slice(0, 3);
  const rest = users.slice(3);
  const medalColors = ['text-amber-400', 'text-slate-300', 'text-orange-400'];

  return (
    <div className="space-y-6">
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-3 items-end">
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((user, idx) => {
            const actualRank = idx === 1 ? 0 : idx === 0 ? 1 : 2;
            const height = actualRank === 0 ? 'pb-8' : actualRank === 1 ? 'pb-4' : 'pb-2';
            return (
              <motion.div key={user!.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn('glass rounded-xl p-4 text-center border border-border/50', height, user!.id === currentUserId && 'border-violet-500/50')}>
                {actualRank === 0 && <Crown className="w-6 h-6 text-amber-400 mx-auto mb-1" />}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold mx-auto mb-2">{user!.full_name?.[0] || '?'}</div>
                <p className="font-semibold text-sm truncate">{user!.full_name}</p>
                <p className="text-xs text-violet-400 font-medium">{formatXP(user!.xp)}</p>
                <Medal className={cn('w-4 h-4 mx-auto mt-1', medalColors[actualRank])} />
              </motion.div>
            );
          })}
        </div>
      )}
      <div className="space-y-2">
        {rest.map((user, i) => (
          <div key={user.id} className={cn('flex items-center gap-3 p-3 rounded-xl glass border border-border/50', user.id === currentUserId && 'border-violet-500/50 bg-violet-500/5')}>
            <span className="w-6 text-center text-sm font-semibold text-muted-foreground">{i + 4}</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">{user.full_name?.[0] || '?'}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user.full_name}</p><p className="text-xs text-muted-foreground">{user.board || 'N/A'}</p></div>
            {user.streak > 0 && <span className="flex items-center gap-0.5 text-xs text-orange-400"><Flame className="w-3 h-3" />{user.streak}</span>}
            <span className="text-sm font-semibold text-violet-400">{formatXP(user.xp)}</span>
          </div>
        ))}
        {users.length === 0 && <p className="text-center py-8 text-muted-foreground">No data available yet</p>}
      </div>
    </div>
  );
}
