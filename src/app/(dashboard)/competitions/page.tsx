import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CompetitionHub } from '@/components/features/competitions/CompetitionHub';
import {
  getSubjectChampionships,
  getUserCompetitionHistory,
  getUserInstitutionScope,
  getWeeklyLeagueSummary,
  listPortalCompetitions,
} from '@/lib/competitions/queries';
import { competitionStatus } from '@/lib/competitions/types';

export const metadata: Metadata = { title: 'Competition Portal' };

export default async function CompetitionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const db = supabase as any;

  const scopeInfo = await getUserInstitutionScope(db, user.id);
  const [competitions, championships, weekly, history] = await Promise.all([
    listPortalCompetitions(db, scopeInfo),
    getSubjectChampionships(db),
    getWeeklyLeagueSummary(db, user.id),
    getUserCompetitionHistory(db, user.id),
  ]);

  const competitionIds = competitions.map((c) => c.id);
  const { data: myEntries } = competitionIds.length
    ? await db.from('competition_entries').select('competition_id, completed_at, score, rank').eq('user_id', user.id).in('competition_id', competitionIds)
    : { data: [] as any[] };
  const entryByCompetition = new Map<string, { completed_at: string | null; score: number | null; rank: number | null }>(
    (myEntries || []).map((e: any) => [e.competition_id, e])
  );

  const cards = competitions.map((competition) => ({
    id: competition.id,
    type: competition.competition_type,
    title: competition.title,
    description: competition.description,
    status: competitionStatus(competition),
    startsAt: competition.starts_at,
    endsAt: competition.ends_at,
    questionCount: competition.question_count,
    timeLimitSeconds: competition.time_limit_seconds,
    xpReward: competition.xp_reward,
    coinReward: competition.coin_reward,
    myEntry: entryByCompetition.get(competition.id) || null,
  }));

  const canCreate = Boolean(scopeInfo && ['owner', 'admin', 'teacher'].includes(scopeInfo.role));
  let formOptions: { subjects: any[]; chaptersBySubject: Record<string, any[]>; sections: any[] } = {
    subjects: [],
    chaptersBySubject: {},
    sections: [],
  };
  if (canCreate && scopeInfo) {
    const [{ data: subjects }, { data: chapters }, { data: sections }] = await Promise.all([
      db.from('subjects').select('id, name').eq('is_active', true).order('name').limit(60),
      db.from('chapters').select('id, subject_id, name').eq('is_active', true).order('order_index').limit(1000),
      scopeInfo.kind === 'school'
        ? db.from('school_sections').select('id, name, school_classes(name)').eq('organization_id', scopeInfo.organizationId).eq('is_active', true)
        : db.from('college_sections').select('id, name, college_semesters(name)').eq('organization_id', scopeInfo.organizationId).eq('is_active', true),
    ]);
    const chaptersBySubject: Record<string, any[]> = {};
    for (const chapter of chapters || []) {
      (chaptersBySubject[chapter.subject_id] ||= []).push({ id: chapter.id, name: chapter.name });
    }
    const sectionOptions = (sections || []).map((section: any) => {
      const parent = Array.isArray(section.school_classes || section.college_semesters)
        ? (section.school_classes || section.college_semesters)[0]
        : section.school_classes || section.college_semesters;
      return { id: section.id, label: parent?.name ? `${parent.name} - ${section.name}` : section.name };
    });
    formOptions = { subjects: subjects || [], chaptersBySubject, sections: sectionOptions };
  }

  return (
    <div className="mx-auto max-w-5xl">
      <CompetitionHub
        competitions={cards}
        championships={championships}
        weekly={weekly}
        history={history}
        canCreate={canCreate}
        scopeKind={scopeInfo?.kind || null}
        formOptions={formOptions}
      />
    </div>
  );
}
