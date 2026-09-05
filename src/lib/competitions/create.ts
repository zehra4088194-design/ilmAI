// Plain (non-'use server') creation helpers — called from the daily-challenge cron and from the
// 'use server' actions in actions.ts. Kept separate so the cron route can import it directly
// without going through the server-action layer.

import { createServiceClient } from '@/lib/supabase/service';
import { getCurrentWeekStart } from '@/lib/gamification/week';
import { buildCompetitionTemplate, pickRandomChapterWithBank } from './build-template';

const QUESTION_COUNT = 10;
const TIME_LIMIT_SECONDS = 600; // 10 minutes

export async function createDailyCompetitionIfMissing() {
  const db = createServiceClient() as any;
  const today = new Date();
  const startsAt = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const endsAt = new Date(startsAt.getTime() + 24 * 60 * 60_000);

  const { data: existing } = await db
    .from('competitions')
    .select('id')
    .eq('competition_type', 'daily')
    .eq('scope', 'global')
    .gte('starts_at', startsAt.toISOString())
    .lt('starts_at', endsAt.toISOString())
    .maybeSingle();
  if (existing) return { created: false, id: existing.id };

  const pick = await pickRandomChapterWithBank(QUESTION_COUNT);
  if (!pick) return { created: false, reason: 'No chapter with a ready question bank was found.' };

  const title = `Daily Challenge — ${startsAt.toISOString().slice(0, 10)}`;
  const { template, subjectName, chapterName } = await buildCompetitionTemplate({
    subjectId: pick.subjectId,
    chapterId: pick.chapterId,
    questionCount: QUESTION_COUNT,
    title,
  });

  const { data: inserted, error } = await db
    .from('competitions')
    .insert({
      competition_type: 'daily',
      scope: 'global',
      title,
      description: `Today's 10-question challenge from ${subjectName} — ${chapterName}. Same questions for everyone, ${TIME_LIMIT_SECONDS / 60} minutes on the clock.`,
      subject_id: pick.subjectId,
      chapter_id: pick.chapterId,
      quiz_session_template: template,
      question_count: QUESTION_COUNT,
      time_limit_seconds: TIME_LIMIT_SECONDS,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      xp_reward: 60,
      coin_reward: 25,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return { created: true, id: inserted.id };
}

// Subject Championships (boss_quizzes) had a table and a dashboard teaser card
// (BossQuizCard) but no code anywhere ever inserted a row or let a student play one — this is
// the "update what's broken" half of that feature, not a new system. One boss quiz per active
// subject per week, built from the same source-grounded chapter bank as everything else here.
const BOSS_QUIZ_QUESTION_COUNT = 12;
// Bounds one cron run's wall-clock time — a subject with no ready question bank yet just gets
// picked up by the next twice-daily run instead of blocking the whole batch.
const MAX_BOSS_QUIZZES_PER_RUN = 10;

export async function createWeeklyBossQuizzesIfMissing() {
  const db = createServiceClient() as any;
  const weekStart = getCurrentWeekStart();
  const { data: subjects } = await db.from('subjects').select('id, name').eq('is_active', true).limit(40);
  const { data: existingRows } = await db.from('boss_quizzes').select('subject_id').eq('week_start_date', weekStart);
  const alreadyHave = new Set((existingRows || []).map((row: any) => row.subject_id));
  const pending = (subjects || []).filter((s: any) => !alreadyHave.has(s.id)).slice(0, MAX_BOSS_QUIZZES_PER_RUN);

  const results: Array<{ subjectId: string; created: boolean; reason?: string }> = [];
  for (const subject of pending) {
    const pick = await pickRandomChapterWithBank(BOSS_QUIZ_QUESTION_COUNT, subject.id);
    if (!pick) {
      results.push({ subjectId: subject.id, created: false, reason: 'no ready question bank for this subject yet' });
      continue;
    }
    try {
      const { template } = await buildCompetitionTemplate({
        subjectId: subject.id,
        chapterId: pick.chapterId,
        questionCount: BOSS_QUIZ_QUESTION_COUNT,
        title: `${subject.name} Championship`,
      });
      const { error } = await db.from('boss_quizzes').insert({
        subject_id: subject.id,
        week_start_date: weekStart,
        quiz_session_template: template,
        xp_reward: 120,
        coin_reward: 50,
      });
      results.push({ subjectId: subject.id, created: !error, reason: error?.message });
    } catch (error) {
      results.push({ subjectId: subject.id, created: false, reason: error instanceof Error ? error.message : 'failed' });
    }
  }
  return results;
}

export async function createScopedCompetition(input: {
  competitionType: 'class_vs_class' | 'school_vs_school';
  scope: 'school' | 'college';
  organizationId: string;
  sectionAId?: string | null;
  sectionBId?: string | null;
  title: string;
  subjectId: string;
  chapterId: string;
  durationHours: number;
  createdBy: string;
}) {
  const db = createServiceClient() as any;
  const { template, subjectName, chapterName } = await buildCompetitionTemplate({
    subjectId: input.subjectId,
    chapterId: input.chapterId,
    questionCount: QUESTION_COUNT,
    title: input.title,
  });
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + input.durationHours * 60 * 60_000);

  const { data: inserted, error } = await db
    .from('competitions')
    .insert({
      competition_type: input.competitionType,
      scope: input.scope,
      organization_id: input.organizationId,
      section_a_id: input.sectionAId || null,
      section_b_id: input.sectionBId || null,
      title: input.title,
      description: `${subjectName} — ${chapterName}. ${input.durationHours}h to compete.`,
      subject_id: input.subjectId,
      chapter_id: input.chapterId,
      quiz_session_template: template,
      question_count: QUESTION_COUNT,
      time_limit_seconds: TIME_LIMIT_SECONDS,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      xp_reward: 100,
      coin_reward: 40,
      created_by: input.createdBy,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return inserted.id as string;
}
