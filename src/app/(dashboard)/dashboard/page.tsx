import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WelcomeSection } from '@/components/features/dashboard/WelcomeSection';
import { StatsGrid } from '@/components/features/dashboard/StatsGrid';
import { ContinueLearning } from '@/components/features/dashboard/ContinueLearning';
import { RecentActivity } from '@/components/features/dashboard/RecentActivity';
import { QuickActions } from '@/components/features/dashboard/QuickActions';
import { UniversityDashboard } from '@/components/features/dashboard/UniversityDashboard';
import { StudyCommandCenter } from '@/components/features/dashboard/StudyCommandCenter';
import { RevisionPlannerCard } from '@/components/features/dashboard/RevisionPlannerCard';
import { WeaknessRadar } from '@/components/features/dashboard/WeaknessRadar';
import { BossQuizCard } from '@/components/features/dashboard/BossQuizCard';
import { OpportunityDeadlinesCard } from '@/components/features/dashboard/OpportunityDeadlinesCard';
import { Button } from '@/components/ui/button';
import { ParentQrLinkCard } from '@/components/features/parent/ParentQrScanner';
import { InstallAppButton } from '@/components/features/dashboard/InstallAppButton';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  // Parents get redirected to their own dashboard automatically
  if (profile?.role === 'parent') redirect('/parent');
  const { data: approvedParentLink } = await supabase
    .from('parent_student_links')
    .select('id')
    .eq('student_id', user!.id)
    .eq('status', 'approved')
    .maybeSingle();
  if (profile?.education_level === 'university') {
    return (
      <div className="space-y-6">
        <InstallAppButton />
        {!approvedParentLink && <ParentQrLinkCard />}
        <UniversityDashboard profile={profile} />
      </div>
    );
  }

  let subjectsQuery = supabase.from('subjects').select('id, name').eq('is_active', true).order('name').limit(8);
  if (profile?.board) subjectsQuery = subjectsQuery.contains('boards', [profile.board]);
  if (profile?.grade_level) subjectsQuery = subjectsQuery.contains('grade_levels', [profile.grade_level]);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() || 7) + 1);
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const [{ data: subjects }, { data: quizSessions }, { data: bossQuiz }, { data: opportunityDeadlines }] =
    await Promise.all([
      subjectsQuery,
      supabase
        .from('quiz_sessions')
        .select('subject_id, score')
        .eq('user_id', user!.id)
        .eq('status', 'COMPLETED')
        .not('score', 'is', null)
        .limit(50),
      supabase
        .from('boss_quizzes' as any)
        .select('id, xp_reward, coin_reward')
        .eq('week_start_date', weekStart.toISOString().slice(0, 10))
        .limit(1)
        .maybeSingle(),
      supabase
        .from('opportunity_bookmarks' as any)
        .select('reminder_date, opportunities(title, deadline)')
        .eq('student_id', user!.id)
        .gte('reminder_date', today.toISOString().slice(0, 10))
        .lte('reminder_date', nextWeek.toISOString().slice(0, 10))
        .order('reminder_date', { ascending: true })
        .limit(3),
    ]);

  const subjectNames = new Map((subjects || []).map((subject) => [subject.id, subject.name]));
  const groupedScores = new Map<string, number[]>();
  for (const session of quizSessions || []) {
    if (!session.subject_id || session.score === null) continue;
    const list = groupedScores.get(session.subject_id) || [];
    list.push(Number(session.score));
    groupedScores.set(session.subject_id, list);
  }
  const subjectScores = Array.from(groupedScores.entries()).map(([subjectId, scores]) => ({
    subjectId,
    subjectName: subjectNames.get(subjectId) || 'Subject',
    average: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    attempts: scores.length,
  }));
  const focusSubject = subjectScores.length
    ? [...subjectScores].sort((a, b) => a.average - b.average)[0]?.subjectName
    : subjects?.[0]?.name;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <InstallAppButton />
      {profile?.subscription_tier === 'FREE' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-600/15 via-indigo-500/10 to-cyan-500/10 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-300">Upgrade to Pro</p>
            <p className="text-muted-foreground text-sm">
              AI tools, summaries, downloads, Study Buddies chat aur higher daily limits unlock karo.
            </p>
          </div>
          <Button asChild variant="gradient" className="shrink-0">
            <Link href="/subscription">Upgrade to Pro</Link>
          </Button>
        </div>
      )}
      <WelcomeSection
        name={profile?.full_name || 'Student'}
        streak={profile?.streak || 0}
        institutionName={profile?.sponsored_institution_name}
      />
      {!approvedParentLink && <ParentQrLinkCard />}
      <StatsGrid
        xp={profile?.xp || 0}
        level={profile?.level || 1}
        streak={profile?.streak || 0}
        studyTime={profile?.total_study_time || 0}
      />
      <StudyCommandCenter streak={profile?.streak || 0} subjects={subjects || []} scores={subjectScores} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <WeaknessRadar scores={subjectScores} />
          <ContinueLearning />
          <RecentActivity userId={user!.id} />
        </div>
        <div className="space-y-6">
          <BossQuizCard bossQuiz={(bossQuiz as any) || null} />
          <OpportunityDeadlinesCard deadlines={(opportunityDeadlines as any) || []} />
          <RevisionPlannerCard board={profile?.board} gradeLevel={profile?.grade_level} focusSubject={focusSubject} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
