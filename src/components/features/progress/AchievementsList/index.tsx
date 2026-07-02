import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const ACHIEVEMENTS = [
  { name: 'First Steps', desc: 'Complete your first quiz', earned: true },
  { name: 'Week Warrior', desc: '7 day study streak', earned: true },
  { name: 'Perfect Score', desc: 'Get 100% on a quiz', earned: false },
  { name: 'Bookworm', desc: 'Study 10 hours total', earned: false },
];

export function AchievementsList({ userId }: { userId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Achievements</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {ACHIEVEMENTS.map((a, i) => (
          <div key={i} className={cn('p-3 rounded-xl border text-center', a.earned ? 'border-amber-500/30 bg-amber-500/5' : 'border-border opacity-50')}>
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2', a.earned ? 'bg-amber-500/20' : 'bg-muted')}>
              {a.earned ? <Trophy className="w-5 h-5 text-amber-500" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
            </div>
            <p className="text-xs font-medium">{a.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{a.desc}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
