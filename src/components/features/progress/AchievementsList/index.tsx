import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Lock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export async function AchievementsList({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [{ data: achievements }, { data: earned }] = await Promise.all([
    supabase.from('achievements').select('id, name, description, icon_url').order('condition_value', { ascending: true }),
    supabase.from('user_achievements').select('achievement_id').eq('user_id', userId),
  ]);

  const earnedIds = new Set((earned || []).map((e) => e.achievement_id));
  const list = achievements || [];

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Achievements</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {list.map((a) => {
          const isEarned = earnedIds.has(a.id);
          return (
            <div key={a.id} className={cn('p-3 rounded-xl border text-center', isEarned ? 'border-amber-500/30 bg-amber-500/5' : 'border-border opacity-50')}>
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2', isEarned ? 'bg-amber-500/20' : 'bg-muted')}>
                {isEarned ? <Trophy className="w-5 h-5 text-amber-500" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
              </div>
              <p className="text-xs font-medium">{a.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{a.description}</p>
            </div>
          );
        })}
        {list.length === 0 && (
          <p className="col-span-2 text-sm text-muted-foreground text-center py-4">Achievements jald hi add honge</p>
        )}
      </CardContent>
    </Card>
  );
}
