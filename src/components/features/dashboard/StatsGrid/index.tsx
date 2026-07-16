'use client';
import { Zap, Trophy, Flame, Clock } from 'lucide-react';
import { formatDuration, formatXP } from '@/lib/utils/format';

export function StatsGrid({ xp, level, streak, studyTime }: { xp: number; level: number; streak: number; studyTime: number }) {
  const stats = [
    { icon: Zap, label: 'Total XP', value: formatXP(xp), color: 'from-violet-500 to-purple-600' },
    { icon: Trophy, label: 'Level', value: `Level ${level}`, color: 'from-amber-500 to-orange-600' },
    { icon: Flame, label: 'Streak', value: `${streak} days`, color: 'from-red-500 to-pink-600' },
    { icon: Clock, label: 'Study Time', value: formatDuration(studyTime), color: 'from-blue-500 to-indigo-600' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="dashboard-surface rounded-xl border border-border/70 p-4 text-foreground shadow-sm">
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
            <stat.icon className="w-4 h-4 text-white" />
          </div>
          <p className="text-xl font-bold">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
