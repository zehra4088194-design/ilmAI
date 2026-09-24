// Read-side for the Competition Portal. Daily/Class-vs-Class/School-vs-School come from the new
// `competitions` table; Subject Championships and Weekly Competitions are read straight off the
// existing boss_quizzes and league_memberships tables — nothing about those two is duplicated.

import { getCurrentWeekStart } from '@/lib/gamification/week';
import { medalFor } from './types';
import type { CompetitionRow, CompetitionEntryRow } from './types';

function rows<T>(data: T[] | null): T[] {
  return data || [];
}

/** The school/college membership (if any) that scopes class-vs-class / school-vs-school for this user. */
export async function getUserInstitutionScope(db: any, userId: string) {
  const [{ data: school }, { data: college }] = await Promise.all([
    db.from('school_memberships').select('organization_id, member_role').eq('profile_id', userId).eq('status', 'active').maybeSingle(),
    db.from('college_memberships').select('organization_id, member_role').eq('profile_id', userId).eq('status', 'active').maybeSingle(),
  ]);
  if (school?.organization_id) return { kind: 'school' as const, organizationId: school.organization_id, role: school.member_role };
  if (college?.organization_id) return { kind: 'college' as const, organizationId: college.organization_id, role: college.member_role };
  return null;
}

export async function listPortalCompetitions(
  db: any,
  scopeInfo: { kind: 'school' | 'college'; organizationId: string } | null
) {
  let query = db
    .from('competitions')
    .select('*')
    .order('starts_at', { ascending: false })
    .limit(100);
  if (scopeInfo) {
    query = query.or(`scope.eq.global,and(scope.eq.${scopeInfo.kind === 'school' ? 'school' : 'college'},organization_id.eq.${scopeInfo.organizationId})`);
  } else {
    query = query.eq('scope', 'global');
  }
  const { data } = await query;
  return rows<CompetitionRow>(data);
}

export async function getSubjectChampionships(db: any) {
  const { data: bossQuizzes } = await db
    .from('boss_quizzes')
    .select('id, subject_id, week_start_date, xp_reward, coin_reward, subjects(name)')
    .order('week_start_date', { ascending: false })
    .limit(20);
  const list = rows<any>(bossQuizzes);
  const ids = list.map((row) => row.id);
  const { data: attempts } = ids.length
    ? await db.from('boss_quiz_attempts').select('boss_quiz_id, user_id, score, completed_at').in('boss_quiz_id', ids)
    : { data: [] };
  const attemptsByQuiz = new Map<string, any[]>();
  for (const attempt of attempts || []) {
    const list2 = attemptsByQuiz.get(attempt.boss_quiz_id) || [];
    list2.push(attempt);
    attemptsByQuiz.set(attempt.boss_quiz_id, list2);
  }
  const currentWeek = getCurrentWeekStart();
  return list.map((row) => {
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
    const weekEnd = new Date(row.week_start_date);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const status: 'upcoming' | 'active' | 'completed' =
      row.week_start_date > currentWeek ? 'upcoming' : row.week_start_date === currentWeek ? 'active' : 'completed';
    const weekAttempts = (attemptsByQuiz.get(row.id) || []).filter((a) => a.completed_at);
    return {
      id: row.id,
      title: `${subject?.name || 'Subject'} Championship`,
      subjectName: subject?.name || 'Subject',
      status,
      weekStart: row.week_start_date,
      endsAt: weekEnd.toISOString(),
      xpReward: row.xp_reward,
      coinReward: row.coin_reward,
      participantCount: weekAttempts.length,
    };
  });
}

export async function getWeeklyLeagueSummary(db: any, userId: string) {
  const weekStart = getCurrentWeekStart();
  const { data: mine } = await db
    .from('league_memberships')
    .select('tier, weekly_xp')
    .eq('user_id', userId)
    .eq('week_start_date', weekStart)
    .maybeSingle();
  const { count } = await db
    .from('league_memberships')
    .select('user_id', { count: 'exact', head: true })
    .eq('week_start_date', weekStart)
    .eq('tier', mine?.tier || 'bronze');
  return { tier: mine?.tier || 'bronze', weeklyXp: mine?.weekly_xp || 0, tierParticipants: count || 0, weekStart };
}

export async function getCompetitionDetail(db: any, competitionId: string) {
  const { data: competition } = await db.from('competitions').select('*').eq('id', competitionId).maybeSingle();
  if (!competition) return null;
  const { data: entries } = await db
    .from('competition_entries')
    .select('*')
    .eq('competition_id', competitionId)
    .order('score', { ascending: false, nullsFirst: false })
    .order('time_spent', { ascending: true });
  const entryRows = rows<CompetitionEntryRow>(entries);
  const userIds = entryRows.map((e) => e.user_id);
  const { data: profiles } = userIds.length
    ? await db.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
    : { data: [] };
  const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>(
    (profiles || []).map((p: any) => [p.id, p])
  );
  const leaderboard = entryRows.map((entry, index) => ({
    ...entry,
    rank: entry.completed_at ? entry.rank ?? index + 1 : null,
    medal: entry.completed_at ? medalFor(entry.rank ?? index + 1) : null,
    profile: profileMap.get(entry.user_id) || null,
  }));
  return { competition: competition as CompetitionRow, leaderboard };
}

export async function getUserCompetitionEntry(db: any, competitionId: string, userId: string) {
  const { data } = await db.from('competition_entries').select('*').eq('competition_id', competitionId).eq('user_id', userId).maybeSingle();
  return data as CompetitionEntryRow | null;
}

/** "Competition history" tab — merges finished new-style entries with finished boss quiz attempts. */
export async function getUserCompetitionHistory(db: any, userId: string) {
  const [{ data: entries }, { data: bossAttempts }] = await Promise.all([
    db
      .from('competition_entries')
      .select('*, competitions(title, competition_type, ends_at)')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50),
    db
      .from('boss_quiz_attempts')
      .select('*, boss_quizzes(week_start_date, subjects(name))')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50),
  ]);

  const fromCompetitions = rows<any>(entries).map((row) => {
    const competition = Array.isArray(row.competitions) ? row.competitions[0] : row.competitions;
    return {
      id: row.id,
      title: competition?.title || 'Competition',
      type: competition?.competition_type || 'daily',
      completedAt: row.completed_at,
      score: row.score,
      rank: row.rank,
      percentile: row.percentile,
      medal: medalFor(row.rank),
    };
  });
  const fromBoss = rows<any>(bossAttempts).map((row) => {
    const bossQuiz = Array.isArray(row.boss_quizzes) ? row.boss_quizzes[0] : row.boss_quizzes;
    const subject = bossQuiz ? (Array.isArray(bossQuiz.subjects) ? bossQuiz.subjects[0] : bossQuiz.subjects) : null;
    return {
      id: row.id,
      title: `${subject?.name || 'Subject'} Championship`,
      type: 'subject' as const,
      completedAt: row.completed_at,
      score: row.score,
      rank: null,
      percentile: null,
      medal: null,
    };
  });

  return [...fromCompetitions, ...fromBoss].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}
