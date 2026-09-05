import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Coins, Crown, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWeekStart } from '@/lib/gamification/week';
import { BOSS_QUIZ_WIN_SCORE } from '@/lib/gamification/constants';

export const metadata: Metadata = { title: 'Subject Championship' };

export default async function SubjectChampionshipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const db = supabase as any;

  const { data: bossQuiz } = await db.from('boss_quizzes').select('*, subjects(name)').eq('id', id).maybeSingle();
  if (!bossQuiz) notFound();
  const subject = Array.isArray(bossQuiz.subjects) ? bossQuiz.subjects[0] : bossQuiz.subjects;
  const isCurrentWeek = bossQuiz.week_start_date === getCurrentWeekStart();

  const { data: myAttempt } = await db.from('boss_quiz_attempts').select('score, completed_at').eq('boss_quiz_id', id).eq('user_id', user.id).maybeSingle();
  const { data: attempts } = await db
    .from('boss_quiz_attempts')
    .select('user_id, score, profiles(full_name)')
    .eq('boss_quiz_id', id)
    .not('completed_at', 'is', null)
    .order('score', { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/competitions" className="text-muted-foreground inline-flex items-center gap-1.5 text-sm hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Competition Portal
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Subject Championship</Badge>
            <Badge variant={isCurrentWeek ? 'default' : 'outline'}>{isCurrentWeek ? 'Active this week' : 'Past week'}</Badge>
          </div>
          <CardTitle className="flex items-center gap-2 text-2xl"><Crown className="h-5 w-5 text-amber-400" />{subject?.name || 'Subject'} Championship</CardTitle>
          <p className="text-muted-foreground text-sm">Score {BOSS_QUIZ_WIN_SCORE}% or higher to win the full reward.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-violet-400" />{bossQuiz.xp_reward} XP</span>
            <span className="flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-amber-400" />{bossQuiz.coin_reward} coins</span>
          </div>

          {myAttempt?.completed_at ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="text-2xl">{myAttempt.score >= BOSS_QUIZ_WIN_SCORE ? '🏆' : '📊'}</div>
              <p className="text-sm font-semibold">You scored {myAttempt.score}% — {myAttempt.score >= BOSS_QUIZ_WIN_SCORE ? 'Championship won!' : 'try again next week.'}</p>
            </div>
          ) : isCurrentWeek ? (
            <Button asChild variant="gradient" size="lg" className="w-full">
              <Link href={`/competitions/subject/${id}/play`}>
                <Zap className="h-4 w-4" /> Enter championship
              </Link>
            </Button>
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">This championship week has ended.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Leaderboard</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(attempts || []).map((row: any, index: number) => {
            const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
            return (
              <div key={row.user_id} className={`flex items-center gap-3 rounded-lg border p-2.5 text-sm ${row.user_id === user.id ? 'border-violet-500/60 bg-violet-500/5' : 'border-border'}`}>
                <span className="w-7 shrink-0 text-center font-bold">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{profile?.full_name || 'Student'}</span>
                <span className="shrink-0 font-bold text-violet-500">{row.score}%</span>
              </div>
            );
          })}
          {!attempts?.length && <p className="text-muted-foreground py-6 text-center text-sm">No one has finished yet — be the first.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
