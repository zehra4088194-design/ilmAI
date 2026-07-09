import { Metadata } from 'next';
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

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  // Parents get redirected to their own dashboard automatically
  if (profile?.role === 'parent') redirect('/parent');
  if (profile?.education_level === 'university') {
    return <UniversityDashboard profile={profile} />;
  }

  let subjectsQuery = supabase.from('subjects').select('id, name').eq('is_active', true).order('name').limit(8);
  if (profile?.board) subjectsQuery = subjectsQuery.contains('boards', [profile.board]);
  if (profile?.grade_level) subjectsQuery = subjectsQuery.contains('grade_levels', [profile.grade_level]);
  const [{ data: subjects }, { data: quizSessions }] = await Promise.all([
    subjectsQuery,
    supabase
      .from('quiz_sessions')
      .select('subject_id, score')
      .eq('user_id', user!.id)
      .eq('status', 'COMPLETED')
      .not('score', 'is', null)
      .limit(50),
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <WelcomeSection name={profile?.full_name || 'Student'} streak={profile?.streak || 0} />
      <StatsGrid
        xp={profile?.xp || 0}
        level={profile?.level || 1}
        streak={profile?.streak || 0}
        studyTime={profile?.total_study_time || 0}
      />
      <StudyCommandCenter streak={profile?.streak || 0} subjects={subjects || []} scores={subjectScores} />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <WeaknessRadar scores={subjectScores} />
          <ContinueLearning />
          <RecentActivity userId={user!.id} />
        </div>
        <div className="space-y-6">
          <RevisionPlannerCard board={profile?.board} gradeLevel={profile?.grade_level} focusSubject={focusSubject} />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
