// Shared "Today's Learning" daily-mission logic — single source of truth for which
// kids_activity_log categories count toward each of the 5 daily steps. Previously this
// set of rules was hand-duplicated between app/kids/page.tsx and app/kids/mission/page.tsx,
// which risked the two pages drifting out of sync.

/** Any one of these categories in today's activity log satisfies the "Game" step. */
export const KIDS_GAME_CATEGORIES = ['memory', 'quiz', 'listen-repeat', 'urdu', 'gk', 'islamic'] as const;

export interface DailyMissionStatus {
  missionDone: boolean;
  englishDone: boolean;
  mathsDone: boolean;
  quranDone: boolean;
  gameDone: boolean;
  rewardDone: boolean;
  allFiveDone: boolean;
  doneCount: number;
}

/** Buckets today's logged activity categories into the 5-step daily mission + reward flag. */
export function computeDailyMissionStatus(todayCategories: Iterable<string>): DailyMissionStatus {
  const categoriesToday = new Set(todayCategories);
  const missionDone = categoriesToday.has('mission');
  const englishDone = categoriesToday.has('english');
  const mathsDone = categoriesToday.has('maths');
  const quranDone = categoriesToday.has('quran');
  const gameDone = KIDS_GAME_CATEGORIES.some((c) => categoriesToday.has(c));
  const rewardDone = categoriesToday.has('reward');
  const allFiveDone = missionDone && englishDone && mathsDone && quranDone && gameDone;
  const doneCount = [missionDone, englishDone, mathsDone, quranDone, gameDone].filter(Boolean).length;

  return { missionDone, englishDone, mathsDone, quranDone, gameDone, rewardDone, allFiveDone, doneCount };
}
