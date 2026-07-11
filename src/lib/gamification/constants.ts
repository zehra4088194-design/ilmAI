export const XP_PER_PLANNER_COMPLETION_MIN = 5;
export const XP_PER_PLANNER_COMPLETION_MAX = 80;
export const XP_PER_CORRECT_QUIZ_ANSWER = 5;
export const COINS_PER_STUDY_SESSION = 5;
export const COINS_PER_QUIZ_COMPLETION = 3;
export const COINS_PER_BOSS_QUIZ_WIN = 50;
export const BOSS_QUIZ_WIN_SCORE = 80;

export const LEAGUE_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
export type LeagueTier = (typeof LEAGUE_TIERS)[number];
