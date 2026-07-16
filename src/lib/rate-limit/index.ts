// ============================================
// RATE LIMITING (Upstash Redis)
// Used for: daily AI/quiz/voice limits plus weekly OCR and University Hub limits
// All limits are tier-based and configurable from Admin Settings.
// ============================================
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { SubscriptionTier } from '@/types';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings, type ProviderBudgetKey } from '@/lib/platform-settings/shared';

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
  : null;

// In-memory fallback for local dev when Upstash isn't configured
const memoryStore = new Map<string, { count: number; resetAt: number }>();

async function checkMemoryLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }
  if (entry.count >= limit) return { success: false, remaining: 0, reset: entry.resetAt };
  entry.count += 1;
  return { success: true, remaining: limit - entry.count, reset: entry.resetAt };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function weekWindow() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return { key: start.toISOString().slice(0, 10), reset: start.getTime() + WEEK_MS };
}

export type DailyLimitFeature =
  | 'ai_message'
  | 'ai_side_chat'
  | 'ai_tool'
  | 'quiz'
  | 'ocr_scan'
  | `ocr_scan:${'printed' | 'handwritten'}`
  | 'university_hub'
  | 'live_voice_call'
  | `provider:${ProviderBudgetKey}`
  | `ai_tool:${string}`;

export const AI_DAILY_LIMITS = {
  FREE_SIDE_CHAT: 10,
  FREE_TOOL: 3,
  PRO_TOOL: 20,
  ELITE_TOOL: 50,
} as const;

export function getAiDailyLimit(tier: SubscriptionTier, feature: 'side_chat' | 'tool' = 'tool') {
  if (tier === 'ELITE') return AI_DAILY_LIMITS.ELITE_TOOL;
  if (tier === 'PRO') return AI_DAILY_LIMITS.PRO_TOOL;
  return feature === 'side_chat' ? AI_DAILY_LIMITS.FREE_SIDE_CHAT : AI_DAILY_LIMITS.FREE_TOOL;
}

async function getConfiguredPlan(tier: SubscriptionTier) {
  const settings = await getPlatformSettings();
  return getPlanFromSettings(settings, tier);
}

async function getConfiguredAiDailyLimit(tier: SubscriptionTier, feature: 'side_chat' | 'tool' = 'tool') {
  const plan = await getConfiguredPlan(tier);
  return feature === 'side_chat' ? plan.limits.aiSideChatDaily : plan.limits.aiToolDaily;
}

export function getLimitExceededMessage(tier: SubscriptionTier, featureLabel = 'AI tool') {
  if (tier === 'FREE') {
    return `${featureLabel} ki free daily limit complete ho gayi. Pro mein 20/day aur Elite mein 50/day unlock hotay hain.`;
  }
  if (tier === 'PRO') {
    return `${featureLabel} ki Pro daily limit complete ho gayi. Elite mein 50/day miltay hain.`;
  }
  return `${featureLabel} ki Elite daily limit complete ho gayi. Kal phir try karo.`;
}

export async function getConfiguredLimitExceededMessage(tier: SubscriptionTier, featureLabel = 'AI tool') {
  const settings = await getPlatformSettings();
  const free = getPlanFromSettings(settings, 'FREE');
  const pro = getPlanFromSettings(settings, 'PRO');
  const elite = getPlanFromSettings(settings, 'ELITE');
  const isSideChat = featureLabel.toLowerCase().includes('side chat');
  const freeLimit = isSideChat ? free.limits.aiSideChatDaily : free.limits.aiToolDaily;
  const proLimit = isSideChat ? pro.limits.aiSideChatDaily : pro.limits.aiToolDaily;
  const eliteLimit = isSideChat ? elite.limits.aiSideChatDaily : elite.limits.aiToolDaily;

  if (tier === 'FREE') {
    return `${featureLabel} ki free daily limit complete ho gayi. Pro mein ${proLimit}/day aur Elite mein ${eliteLimit}/day unlock hotay hain.`;
  }
  if (tier === 'PRO') {
    return `${featureLabel} ki Pro daily limit complete ho gayi. Elite mein ${eliteLimit}/day miltay hain.`;
  }
  return `${featureLabel} ki Elite daily limit complete ho gayi. Kal phir try karo. Free preview ${freeLimit}/day hai.`;
}

/** Generic daily limiter used for AI messages, quizzes, and live voice calls. */
export async function checkDailyLimit(
  userId: string,
  feature: DailyLimitFeature,
  limit: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  if (limit < 0) return { success: true, remaining: -1, reset: Date.now() + DAY_MS };
  if (limit === 0) return { success: false, remaining: 0, reset: Date.now() + DAY_MS };
  const key = `ratelimit:${feature}:${userId}:${new Date().toISOString().slice(0, 10)}`;

  if (redis) {
    const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(limit, '1 d'), prefix: 'ilm-ai' });
    const result = await ratelimit.limit(key);
    return { success: result.success, remaining: result.remaining, reset: result.reset };
  }
  return checkMemoryLimit(key, limit, DAY_MS);
}

export async function checkWeeklyLimit(
  userId: string,
  feature: DailyLimitFeature,
  limit: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const window = weekWindow();
  if (limit < 0) return { success: true, remaining: -1, reset: window.reset };
  if (limit === 0) return { success: false, remaining: 0, reset: window.reset };
  const key = `ratelimit:${feature}:${userId}:week:${window.key}`;
  if (redis) {
    const count = await redis.incr(`ilm-ai:${key}`);
    if (count === 1) {
      await redis.expireat(`ilm-ai:${key}`, Math.ceil(window.reset / 1000));
    }
    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      reset: window.reset,
    };
  }
  return checkMemoryLimit(key, limit, Math.max(1, window.reset - Date.now()));
}

/** Mode-specific weekly OCR quotas controlled from Admin > Settings. */
export async function checkOcrLimit(
  userId: string,
  tier: SubscriptionTier,
  mode: 'printed' | 'handwritten' = 'printed'
) {
  const plan = await getConfiguredPlan(tier);
  const limit = mode === 'handwritten' ? plan.limits.ocrHandwrittenWeekly : plan.limits.ocrPrintedWeekly;
  return checkWeeklyLimit(userId, `ocr_scan:${mode}`, limit);
}

export async function checkUniversityHubLimit(userId: string, tier: SubscriptionTier) {
  const plan = await getConfiguredPlan(tier);
  return checkWeeklyLimit(userId, 'university_hub', plan.limits.universityHubWeekly);
}

export async function checkUniversityFeatureLimit(userId: string, tier: SubscriptionTier, featureKey: string) {
  const plan = await getConfiguredPlan(tier);
  if (plan.limits.universityHubWeekly >= 0) {
    const weekly = await checkWeeklyLimit(userId, 'university_hub', plan.limits.universityHubWeekly);
    return { ...weekly, scope: 'weekly' as const };
  }

  const daily = await checkAiMessageLimit(userId, tier, featureKey);
  return { ...daily, scope: 'daily' as const };
}

export async function getUniversityLimitExceededMessage(
  tier: SubscriptionTier,
  scope: 'weekly' | 'daily',
  featureLabel: string
) {
  if (scope === 'daily') return getConfiguredLimitExceededMessage(tier, featureLabel);
  const plan = await getConfiguredPlan(tier);
  return `${featureLabel} ki University Hub weekly limit (${plan.limits.universityHubWeekly}) complete ho gayi. Agle Monday reset hogi.`;
}

/** AI side chat messages: Free = 10/day, Pro = 20/day, Elite = 50/day. */
export async function checkAiSideChatLimit(userId: string, tier: SubscriptionTier) {
  return checkDailyLimit(userId, 'ai_side_chat', await getConfiguredAiDailyLimit(tier, 'side_chat'));
}

/** AI tool usage: Free preview = 3/day, Pro = 20/day, Elite = 50/day. */
export async function checkAiToolLimit(userId: string, tier: SubscriptionTier, featureKey = 'general') {
  // All AI tools share one pool. Keeping featureKey in the signature avoids
  // touching every route while preventing each feature from getting a fresh quota.
  void featureKey;
  return checkDailyLimit(userId, 'ai_tool', await getConfiguredAiDailyLimit(tier, 'tool'));
}

/** Platform-wide provider admission control, managed from Admin Settings. */
export async function checkProviderDailyLimit(provider: ProviderBudgetKey) {
  const settings = await getPlatformSettings();
  return checkDailyLimit('platform', `provider:${provider}`, settings.providerDailyBudgets[provider]);
}

/** Backwards-compatible helper used by existing AI routes. */
export async function checkAiMessageLimit(userId: string, tier: SubscriptionTier, featureKey = 'general') {
  return checkAiToolLimit(userId, tier, featureKey);
}

export async function checkQuizLimit(userId: string, tier: SubscriptionTier) {
  const plan = await getConfiguredPlan(tier);
  return checkDailyLimit(userId, 'quiz', plan.limits.quizDaily);
}

// ============================================
// PREMIUM AI MODEL TIER LIMITS (Pro/Elite only)
// Claude, GPT, and Gemini cost real money per call, so even paid users
// get a small daily allowance per model SIZE (not per provider):
// mini -> 10 calls/day (cheap small models)
// medium -> 7 calls/day (mid-size models)
// pro -> 3 calls/day (largest/most expensive models)
// The default Assistant is unmetered here - it uses the normal AI-message pool instead,
// since it's fast/cheap enough to treat as the "default" provider.
// ============================================
const MODEL_TIER_DAILY_LIMITS: Record<'mini' | 'medium' | 'pro', number> = {
  mini: AI_DAILY_LIMITS.PRO_TOOL,
  medium: AI_DAILY_LIMITS.PRO_TOOL,
  pro: AI_DAILY_LIMITS.PRO_TOOL,
};

export async function checkModelTierLimit(
  userId: string,
  provider: string,
  tier: 'mini' | 'medium' | 'pro',
  userTier: SubscriptionTier = 'PRO'
) {
  const plan = await getConfiguredPlan(userTier);
  const limit = plan.limits.aiToolDaily || MODEL_TIER_DAILY_LIMITS[tier] || AI_DAILY_LIMITS.PRO_TOOL;
  // Key includes provider so Claude-mini and GPT-mini have separate pools per provider+tier
  const key = `ratelimit:model_tier:${provider}:${tier}:${userId}:${new Date().toISOString().slice(0, 10)}`;
  if (redis) {
    const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(limit, '1 d'), prefix: 'ilm-ai' });
    const result = await ratelimit.limit(key);
    return { success: result.success, remaining: result.remaining, reset: result.reset };
  }
  return checkMemoryLimit(key, limit, DAY_MS);
}

// ============================================
// LIVE VOICE CALL
// Temporarily disabled while the production Gemini Live flow is being hardened.
// ============================================
const LIVE_VOICE_DAILY_LIMIT_ELITE = AI_DAILY_LIMITS.ELITE_TOOL;

export async function checkLiveVoiceLimit(userId: string, tier: SubscriptionTier) {
  const plan = await getConfiguredPlan(tier);
  if (!plan.access.liveVoice) return { success: false, remaining: 0, reset: 0 };
  return checkDailyLimit(userId, 'live_voice_call', plan.limits.liveVoiceDaily || LIVE_VOICE_DAILY_LIMIT_ELITE);
}
