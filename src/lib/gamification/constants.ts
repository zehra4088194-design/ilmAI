export const XP_PER_PLANNER_COMPLETION_MIN = 5;
export const XP_PER_PLANNER_COMPLETION_MAX = 80;
export const XP_PER_CORRECT_QUIZ_ANSWER = 2;
export const COINS_PER_STUDY_SESSION = 5;
export const COINS_PER_QUIZ_COMPLETION = 3;
export const COINS_PER_BOSS_QUIZ_WIN = 50;
export const BOSS_QUIZ_WIN_SCORE = 80;
// Phase 3a — awarded once per peer doubt-board reply when its asker marks it accepted/helpful.
export const XP_PER_PEER_DOUBT_ANSWER = 15;
export const COINS_PER_PEER_DOUBT_ANSWER = 10;
// Phase 3b — how many peer replies accumulate on a doubt before a moderation safety pass runs,
// mirroring the every-50-messages cadence student-chat uses (doubt boards see far less volume per
// thread than a live chat, so this cadence is proportionally lower).
export const PEER_DOUBT_MODERATION_CHECK_EVERY = 5;

export const LEAGUE_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
export type LeagueTier = (typeof LEAGUE_TIERS)[number];
