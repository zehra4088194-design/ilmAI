import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Award, Clock, Coins, Download, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompetitionLeaderboard } from '@/components/features/competitions/CompetitionLeaderboard';
import { createClient } from '@/lib/supabase/server';
import { getCompetitionDetail } from '@/lib/competitions/queries';
import { COMPETITION_TYPE_LABEL, competitionStatus, medalFor } from '@/lib/competitions/types';

export const metadata: Metadata = { title: 'Competition' };

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const detail = await getCompetitionDetail(supabase as any, id);
  if (!detail) notFound();
  const { competition, leaderboard } = detail;
  const status = competitionStatus(competition);
  const myEntry = leaderboard.find((row) => row.user_id === user.id) || null;

  // Class-vs-Class needs to know which of the two sections each finisher belongs to, so the
  // portal can show a team score, not just an individual leaderboard.
  let teamScores: { sectionALabel: string; sectionBLabel: string; sectionAAvg: number; sectionBAvg: number } | null = null;
  if (competition.competition_type === 'class_vs_class' && competition.section_a_id && competition.section_b_id) {
    const db = supabase as any;
    const enrollmentsTable = competition.scope === 'college' ? 'college_enrollments' : 'school_enrollments';
    const sectionsTable = competition.scope === 'college' ? 'college_sections' : 'school_sections';
    const [{ data: sectionRows }, { data: enrollmentRows }] = await Promise.all([
      db.from(sectionsTable).select('id, name').in('id', [competition.section_a_id, competition.section_b_id]),
      db.from(enrollmentsTable).select('student_id, section_id').in('section_id', [competition.section_a_id, competition.section_b_id]).eq('status', 'active'),
    ]);
    const sectionById = new Map<string, string>((sectionRows || []).map((s: any) => [s.id, s.name]));
    const sectionByStudent = new Map<string, string>((enrollmentRows || []).map((e: any) => [e.student_id, e.section_id]));
    const scoresBySection = new Map<string, number[]>();
    for (const row of leaderboard) {
      if (!row.completed_at) continue;
      const sectionId = sectionByStudent.get(row.user_id);
      if (!sectionId) continue;
      const list = scoresBySection.get(sectionId) || [];
      list.push(Number(row.score || 0));
      scoresBySection.set(sectionId, list);
    }
    const avg = (list: number[] | undefined) => (list?.length ? Math.round((list.reduce((s, v) => s + v, 0) / list.length) * 10) / 10 : 0);
    teamScores = {
      sectionALabel: String(sectionById.get(competition.section_a_id) || 'Section A'),
      sectionBLabel: String(sectionById.get(competition.section_b_id) || 'Section B'),
      sectionAAvg: avg(scoresBySection.get(competition.section_a_id)),
      sectionBAvg: avg(scoresBySection.get(competition.section_b_id)),
    };
  }

  const leaderboardRows = leaderboard
    .filter((row) => row.completed_at)
    .map((row) => ({
      userId: row.user_id,
      fullName: row.profile?.full_name || 'Student',
      avatarUrl: row.profile?.avatar_url || null,
      score: Number(row.score || 0),
      rank: row.rank || 0,
      percentile: row.percentile,
      medal: row.medal,
      isMe: row.user_id === user.id,
    }));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/competitions" className="text-muted-foreground inline-flex items-center gap-1.5 text-sm hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Competition Portal
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{COMPETITION_TYPE_LABEL[competition.competition_type]}</Badge>
            <Badge variant={status === 'active' ? 'default' : status === 'upcoming' ? 'secondary' : 'outline'} className="capitalize">
              {status}
            </Badge>
          </div>
          <CardTitle className="text-2xl">{competition.title}</CardTitle>
          <p className="text-muted-foreground text-sm">{competition.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{Math.round(competition.time_limit_seconds / 60)} min · {competition.question_count} questions</span>
            <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-violet-400" />{competition.xp_reward} XP</span>
            <span className="flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-amber-400" />{competition.coin_reward} coins</span>
          </div>

          {myEntry?.completed_at ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="text-2xl">{medalFor(myEntry.rank) || '🎉'}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">You scored {myEntry.score}% — rank #{myEntry.rank}{myEntry.percentile != null ? ` (top ${Math.round(100 - myEntry.percentile)}%)` : ''}</p>
                <p className="text-muted-foreground text-xs">Completed. Come back next time for another shot.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={`/api/competitions/${competition.id}/certificate`}>
                  <Download className="h-3.5 w-3.5" /> Certificate
                </a>
              </Button>
            </div>
          ) : status === 'active' ? (
            <Button asChild variant="gradient" size="lg" className="w-full">
              <Link href={`/competitions/${competition.id}/play`}>
                <Zap className="h-4 w-4" /> Play now
              </Link>
            </Button>
          ) : status === 'upcoming' ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              Starts {new Date(competition.starts_at).toLocaleString()}
            </p>
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">This competition has ended.</p>
          )}
        </CardContent>
      </Card>

      {teamScores && (
        <Card>
          <CardHeader><CardTitle className="text-base">Team score</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-center">
            <div className={teamScores.sectionAAvg >= teamScores.sectionBAvg ? 'rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4' : 'rounded-lg border p-4'}>
              <p className="text-muted-foreground text-xs">{teamScores.sectionALabel}</p>
              <p className="mt-1 text-2xl font-bold">{teamScores.sectionAAvg}%</p>
            </div>
            <div className={teamScores.sectionBAvg > teamScores.sectionAAvg ? 'rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4' : 'rounded-lg border p-4'}>
              <p className="text-muted-foreground text-xs">{teamScores.sectionBLabel}</p>
              <p className="mt-1 text-2xl font-bold">{teamScores.sectionBAvg}%</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base"><Award className="h-4 w-4 text-amber-500" />Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <CompetitionLeaderboard competitionId={competition.id} isActive={status === 'active'} initialLeaderboard={leaderboardRows} />
        </CardContent>
      </Card>
    </div>
  );
}
