// Shared shapes for the Competition Portal. See supabase/migrations/20260903150000_competition_portal.sql
// for why this only covers Daily Challenge + Class-vs-Class + School-vs-School — Weekly
// Competitions and Subject Championships reuse league_memberships and boss_quizzes as-is.

export type CompetitionType = 'daily' | 'class_vs_class' | 'school_vs_school';
export type CompetitionScope = 'global' | 'school' | 'college';
export type CompetitionStatus = 'upcoming' | 'active' | 'completed';

export type CompetitionRow = {
  id: string;
  competition_type: CompetitionType;
  scope: CompetitionScope;
  organization_id: string | null;
  section_a_id: string | null;
  section_b_id: string | null;
  title: string;
  description: string;
  subject_id: string | null;
  chapter_id: string | null;
  quiz_session_template: any;
  question_count: number;
  time_limit_seconds: number;
  starts_at: string;
  ends_at: string;
  xp_reward: number;
  coin_reward: number;
  created_by: string | null;
  created_at: string;
};

export type CompetitionEntryRow = {
  id: string;
  competition_id: string;
  user_id: string;
  quiz_session_id: string | null;
  score: number | null;
  correct_count: number | null;
  time_spent: number | null;
  rank: number | null;
  percentile: number | null;
  started_at: string;
  completed_at: string | null;
};

export function competitionStatus(row: Pick<CompetitionRow, 'starts_at' | 'ends_at'>, now = new Date()): CompetitionStatus {
  const t = now.getTime();
  if (t < new Date(row.starts_at).getTime()) return 'upcoming';
  if (t > new Date(row.ends_at).getTime()) return 'completed';
  return 'active';
}

export const COMPETITION_TYPE_LABEL: Record<CompetitionType | 'weekly' | 'subject', string> = {
  daily: 'Daily Challenge',
  weekly: 'Weekly Competition',
  subject: 'Subject Championship',
  class_vs_class: 'Class vs Class',
  school_vs_school: 'School vs School',
};

export function medalFor(rank: number | null | undefined): '🥇' | '🥈' | '🥉' | null {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
}
