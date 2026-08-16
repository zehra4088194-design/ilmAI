import type { SubscriptionTier } from '@/types';
import { createServiceClient } from '@/lib/supabase/service';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import {
  DEFAULT_PLATFORM_SETTINGS,
  getPlanFromSettings,
  type AudienceFeatureLimits,
  type PlanAudience,
  type PlatformSubscriptionPlan,
  type ProviderBudgetKey,
} from '@/lib/platform-settings/shared';
import {
  consumeRedisWeightedWindows,
  consumeRedisWindows,
  type RedisQuotaWindow,
  type WeightedRedisQuotaWindow,
} from '@/lib/redis/client';
import { getRedisCounter } from '@/lib/redis/client';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

type QuotaResult = {
  success: boolean;
  remaining: number;
  reset: number;
};

type MemoryEntry = { count: number; resetAt: number };
const memoryStore = new Map<string, MemoryEntry>();

function dayWindow() {
  const now = new Date();
  const reset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return { key: now.toISOString().slice(0, 10), reset };
}

function weekWindow() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return { key: start.toISOString().slice(0, 10), reset: start.getTime() + WEEK_MS };
}

function monthWindow() {
  const now = new Date();
  const key = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const reset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return { key, reset };
}

function consumeMemoryWindows(windows: RedisQuotaWindow[], amount: number): QuotaResult {
  const now = Date.now();
  const entries = windows.map((window) => {
    const current = memoryStore.get(window.key);
    if (!current || (current.resetAt > 0 && current.resetAt <= now)) {
      return { count: 0, resetAt: window.resetAt };
    }
    return current;
  });
  const blockedIndex = windows.findIndex((window, index) => (entries[index]?.count ?? 0) + amount > window.limit);
  if (blockedIndex >= 0) {
    return { success: false, remaining: 0, reset: windows[blockedIndex]?.resetAt ?? 0 };
  }
  entries.forEach((entry, index) => {
    const window = windows[index];
    if (!window) return;
    memoryStore.set(window.key, {
      count: entry.count + amount,
      resetAt: window.resetAt,
    });
  });
  const remaining = Math.min(...windows.map((window, index) => window.limit - (entries[index]?.count ?? 0) - amount));
  const positiveResets = windows.map((window) => window.resetAt).filter((reset) => reset > 0);
  return {
    success: true,
    remaining,
    reset: positiveResets.length ? Math.min(...positiveResets) : 0,
  };
}

async function consumeStoredWindows(windows: RedisQuotaWindow[], amount = 1): Promise<QuotaResult> {
  const limitedWindows = windows.filter((window) => window.limit >= 0);
  if (!limitedWindows.length) return { success: true, remaining: -1, reset: 0 };
  const immediatelyBlocked = limitedWindows.find((window) => window.limit < amount);
  if (immediatelyBlocked) return { success: false, remaining: 0, reset: immediatelyBlocked.resetAt };

  const namespaced = limitedWindows.map((window) => ({ ...window, key: `ilm-ai:${window.key}` }));
  try {
    const result = await consumeRedisWindows(namespaced, amount);
    if (result) {
      if (!result.allowed) {
        const blocked = namespaced[result.blockedIndex || 0];
        return { success: false, remaining: 0, reset: blocked?.resetAt || 0 };
      }
      const remaining = Math.min(...namespaced.map((window, index) => window.limit - (result.counts[index] || 0)));
      const positiveResets = namespaced.map((window) => window.resetAt).filter((reset) => reset > 0);
      return {
        success: true,
        remaining,
        reset: positiveResets.length ? Math.min(...positiveResets) : 0,
      };
    }
  } catch (error) {
    console.error('Redis quota operation failed:', error);
  }
  return consumeMemoryWindows(namespaced, amount);
}

async function inspectStoredWindows(windows: RedisQuotaWindow[], amount = 1): Promise<QuotaResult> {
  const limitedWindows = windows.filter((window) => window.limit >= 0);
  if (!limitedWindows.length) return { success: true, remaining: -1, reset: 0 };
  const immediatelyBlocked = limitedWindows.find((window) => window.limit < amount);
  if (immediatelyBlocked) return { success: false, remaining: 0, reset: immediatelyBlocked.resetAt };

  const namespaced = limitedWindows.map((window) => ({ ...window, key: `ilm-ai:${window.key}` }));
  const counts = await Promise.all(
    namespaced.map(async (window) => {
      try {
        const redisCount = await getRedisCounter(window.key);
        if (redisCount !== null) return redisCount;
      } catch (error) {
        console.error('Redis quota inspection failed:', error);
      }
      const current = memoryStore.get(window.key);
      return current && (current.resetAt <= 0 || current.resetAt > Date.now()) ? current.count : 0;
    })
  );
  const blockedIndex = namespaced.findIndex((window, index) => (counts[index] || 0) + amount > window.limit);
  if (blockedIndex >= 0) {
    return { success: false, remaining: 0, reset: namespaced[blockedIndex]?.resetAt || 0 };
  }
  const positiveResets = namespaced.map((window) => window.resetAt).filter((reset) => reset > 0);
  return {
    success: true,
    remaining: Math.min(...namespaced.map((window, index) => window.limit - (counts[index] || 0) - amount)),
    reset: positiveResets.length ? Math.min(...positiveResets) : 0,
  };
}

function consumeMemoryWeightedWindows(windows: WeightedRedisQuotaWindow[]): QuotaResult {
  const now = Date.now();
  const entries = windows.map((window) => {
    const current = memoryStore.get(window.key);
    return !current || (current.resetAt > 0 && current.resetAt <= now)
      ? { count: 0, resetAt: window.resetAt }
      : current;
  });
  const blockedIndex = windows.findIndex(
    (window, index) => (entries[index]?.count ?? 0) + window.amount > window.limit
  );
  if (blockedIndex >= 0) {
    return { success: false, remaining: 0, reset: windows[blockedIndex]?.resetAt ?? 0 };
  }
  windows.forEach((window, index) => {
    memoryStore.set(window.key, {
      count: (entries[index]?.count ?? 0) + window.amount,
      resetAt: window.resetAt,
    });
  });
  return {
    success: true,
    remaining: Math.min(...windows.map((window, index) => window.limit - (entries[index]?.count ?? 0) - window.amount)),
    reset: Math.min(...windows.map((window) => window.resetAt).filter((reset) => reset > 0)),
  };
}

async function consumeStoredWeightedWindows(windows: WeightedRedisQuotaWindow[]): Promise<QuotaResult> {
  if (!windows.length) return { success: true, remaining: -1, reset: 0 };
  const immediatelyBlocked = windows.find((window) => window.limit < window.amount);
  if (immediatelyBlocked) return { success: false, remaining: 0, reset: immediatelyBlocked.resetAt };
  const namespaced = windows.map((window) => ({ ...window, key: `ilm-ai:${window.key}` }));
  try {
    const result = await consumeRedisWeightedWindows(namespaced);
    if (result) {
      if (!result.allowed) {
        return {
          success: false,
          remaining: 0,
          reset: namespaced[result.blockedIndex || 0]?.resetAt ?? 0,
        };
      }
      return {
        success: true,
        remaining: Math.min(...namespaced.map((window, index) => window.limit - (result.counts[index] || 0))),
        reset: Math.min(...namespaced.map((window) => window.resetAt).filter((reset) => reset > 0)),
      };
    }
  } catch (error) {
    console.error('Redis weighted quota operation failed:', error);
  }
  return consumeMemoryWeightedWindows(namespaced);
}

export type DailyLimitFeature =
  | 'ai_credit'
  | 'quiz'
  | 'university_hub'
  | 'live_voice_call'
  | 'presentation'
  | 'file_summary'
  | 'file_test'
  | 'premium_ai'
  | 'parent_attachment_file'
  | 'parent_attachment_bytes'
  | `erp_mutation:${string}`
  | `provider:${ProviderBudgetKey}`
  | `ai_tool:${string}`;

export const AI_DAILY_LIMITS = {
  FREE_SIDE_CHAT: 3,
  FREE_TOOL: 3,
  PRO_TOOL: 15,
  ELITE_TOOL: 30,
} as const;

const AI_CREDIT_COSTS: Record<string, number> = {
  general: 1,
  ai_tutor: 1,
  side_chat: 1,
  doubt_teacher: 1,
  explain: 1,
  motivation: 1,
  career: 2,
  routine: 2,
  flashcards: 2,
  practice_questions: 2,
  grade_answer: 1,
  grade_test: 2,
  full_test: 4,
  guess_paper: 4,
  essay_writer: 3,
  humanizer: 2,
  resource_summary: 4,
  book_summary: 4,
  summarize: 4,
  resource_test_analyze: 2,
  resource_test_generate: 4,
  university_presentation: 8,
  pharmapulse_drug: 5,
  pharmapulse_mcq: 2,
  university_pdf_summarizer: 2,
  university_research: 5,
  project_builder: 3,
  career_docs: 3,
  citation: 2,
  ocr_printed: 1,
  ocr_handwritten: 3,
  insights_roadmap: 2,
};

export function getAiCreditCost(featureKey = 'general') {
  if (featureKey === 'university_pdf_summarizer') return AI_CREDIT_COSTS.university_pdf_summarizer;
  if (featureKey === 'university_research') return AI_CREDIT_COSTS.university_research;
  if (featureKey.startsWith('university_') && featureKey !== 'university_presentation') return 3;
  return AI_CREDIT_COSTS[featureKey] ?? 1;
}

export function getAiDailyLimit(tier: SubscriptionTier, _feature: 'side_chat' | 'tool' = 'tool') {
  if (tier === 'ELITE') return AI_DAILY_LIMITS.ELITE_TOOL;
  if (tier === 'PRO') return AI_DAILY_LIMITS.PRO_TOOL;
  return AI_DAILY_LIMITS.FREE_TOOL;
}

async function getConfiguredPlan(tier: SubscriptionTier) {
  const settings = await getPlatformSettings();
  return getPlanFromSettings(settings, tier);
}

async function getUserAudience(userId: string): Promise<PlanAudience> {
  try {
    const db = createServiceClient() as any;
    const { data } = await db.from('profiles').select('education_level').eq('id', userId).maybeSingle();
    if (data?.education_level === 'college' || data?.education_level === 'university') return data.education_level;
  } catch (error) {
    console.error('Audience lookup failed:', error);
  }
  return 'school';
}

export async function getAudiencePlanLimits(
  userId: string,
  tier: SubscriptionTier
): Promise<{ plan: PlatformSubscriptionPlan; audience: PlanAudience; limits: AudienceFeatureLimits }> {
  const [plan, audience] = await Promise.all([getConfiguredPlan(tier), getUserAudience(userId)]);
  return { plan, audience, limits: plan.audienceLimits[audience] };
}

export function getLimitExceededMessage(tier: SubscriptionTier, featureLabel = 'AI tool') {
  if (tier === 'FREE')
    return `You have used all free weekly credits for ${featureLabel}. Upgrade to Pro for monthly credits.`;
  if (tier === 'PRO')
    return `The shared Pro limit for ${featureLabel} has been reached. Elite includes 600 credits per month.`;
  return `The shared Elite limit for ${featureLabel} has been reached. Try again when the current quota window resets.`;
}

export async function getConfiguredLimitExceededMessage(tier: SubscriptionTier, featureLabel = 'AI tool') {
  const settings = await getPlatformSettings();
  const pro = getPlanFromSettings(settings, 'PRO');
  const elite = getPlanFromSettings(settings, 'ELITE');
  if (tier === 'FREE') {
    return `You have used all free weekly credits for ${featureLabel}. Pro includes ${pro.limits.aiCreditsMonthly} per month, up to ${pro.limits.aiCreditsDaily} per day.`;
  }
  if (tier === 'PRO') {
    return `The shared Pro credit pool for ${featureLabel} has been reached. Elite includes ${elite.limits.aiCreditsMonthly} shared credits per month.`;
  }
  return `The shared Elite credit pool for ${featureLabel} has been reached. Try again after the monthly window resets.`;
}

export async function checkDailyLimit(userId: string, feature: DailyLimitFeature, limit: number): Promise<QuotaResult> {
  const window = dayWindow();
  return consumeStoredWindows([
    { key: `ratelimit:${feature}:${userId}:day:${window.key}`, limit, resetAt: window.reset },
  ]);
}

export async function checkWeeklyLimit(
  userId: string,
  feature: DailyLimitFeature,
  limit: number
): Promise<QuotaResult> {
  const window = weekWindow();
  return consumeStoredWindows([
    { key: `ratelimit:${feature}:${userId}:week:${window.key}`, limit, resetAt: window.reset },
  ]);
}

export async function checkMonthlyLimit(
  userId: string,
  feature: DailyLimitFeature,
  limit: number,
  amount = 1
): Promise<QuotaResult> {
  const window = monthWindow();
  return consumeStoredWindows(
    [{ key: `ratelimit:${feature}:${userId}:month:${window.key}`, limit, resetAt: window.reset }],
    amount
  );
}

function buildSharedAiWindows(userId: string, tier: SubscriptionTier, plan: PlatformSubscriptionPlan) {
  if (tier === 'FREE') {
    const week = weekWindow();
    return [
      {
        key: `ratelimit:ai_credit:${userId}:week:${week.key}`,
        limit: plan.limits.aiCreditsWeekly,
        resetAt: week.reset,
      },
    ];
  }
  const month = monthWindow();
  return [
    {
      key: `ratelimit:ai_credit:${userId}:month:${month.key}`,
      limit: plan.limits.aiCreditsMonthly,
      resetAt: month.reset,
    },
  ];
}

async function checkSharedAiLimit(userId: string, tier: SubscriptionTier, featureKey = 'general') {
  const plan = await getConfiguredPlan(tier);
  return inspectStoredWindows(buildSharedAiWindows(userId, tier, plan), getAiCreditCost(featureKey));
}

async function consumeSharedAiCredits(userId: string, tier: SubscriptionTier, featureKey = 'general') {
  const plan = await getConfiguredPlan(tier);
  return consumeStoredWindows(buildSharedAiWindows(userId, tier, plan), getAiCreditCost(featureKey));
}

export async function checkAiSideChatLimit(userId: string, tier: SubscriptionTier) {
  return checkSharedAiLimit(userId, tier, 'side_chat');
}

export async function checkAiToolLimit(userId: string, tier: SubscriptionTier, featureKey = 'general') {
  return checkSharedAiLimit(userId, tier, featureKey);
}

export async function checkAiMessageLimit(userId: string, tier: SubscriptionTier, featureKey = 'general') {
  return checkAiToolLimit(userId, tier, featureKey);
}

export async function consumeAiCredits(userId: string, tier: SubscriptionTier, featureKey = 'general') {
  return consumeSharedAiCredits(userId, tier, featureKey);
}

export function summarizeAiCreditWindows(tier: SubscriptionTier, windows: RedisQuotaWindow[], counts: number[]) {
  const primaryWindowIndex = 0;
  const primaryWindow = windows[primaryWindowIndex] || windows[0];
  const primaryUsed = counts[primaryWindowIndex] ?? counts[0] ?? 0;

  return {
    tier,
    period: tier === 'FREE' ? ('week' as const) : ('month' as const),
    used: primaryUsed,
    remaining: Math.max(0, (primaryWindow?.limit ?? 0) - primaryUsed),
    limit: primaryWindow?.limit ?? 0,
    reset: primaryWindow?.resetAt ?? 0,
    daily: null,
  };
}

export async function getAiCreditStatus(userId: string, tier: SubscriptionTier) {
  const plan = await getConfiguredPlan(tier);
  const windows = buildSharedAiWindows(userId, tier, plan);
  const counts = await Promise.all(
    windows.map(async (window) => {
      const redisCount = await getRedisCounter(`ilm-ai:${window.key}`);
      const memory = memoryStore.get(`ilm-ai:${window.key}`);
      return redisCount ?? memory?.count ?? 0;
    })
  );

  return {
    ...summarizeAiCreditWindows(tier, windows, counts),
    costs: AI_CREDIT_COSTS,
  };
}

export async function checkProviderDailyLimit(provider: ProviderBudgetKey) {
  const settings = await getPlatformSettings();
  return checkDailyLimit('platform', `provider:${provider}`, settings.providerDailyBudgets[provider]);
}

export async function checkQuizLimit(userId: string, tier: SubscriptionTier) {
  const plan = await getConfiguredPlan(tier);
  return checkDailyLimit(userId, 'quiz', plan.limits.quizDaily);
}

export async function checkOcrCredits(
  userId: string,
  tier: SubscriptionTier,
  mode: 'printed' | 'handwritten' = 'printed'
) {
  const featureKey = mode === 'handwritten' ? 'ocr_handwritten' : 'ocr_printed';
  const result = await checkAiToolLimit(userId, tier, featureKey);
  return { ...result, creditCost: getAiCreditCost(featureKey) };
}

export async function consumeOcrCredits(
  userId: string,
  tier: SubscriptionTier,
  mode: 'printed' | 'handwritten' = 'printed'
) {
  const featureKey = mode === 'handwritten' ? 'ocr_handwritten' : 'ocr_printed';
  const result = await consumeSharedAiCredits(userId, tier, featureKey);
  return { ...result, creditCost: getAiCreditCost(featureKey) };
}

// Presentation Builder is fully credit-gated: the shared AI credit pool (checked
// separately via checkAiMessageLimit/consumeAiCredits in the route) is what governs
// access. This used to ALSO enforce plan.limits.presentationsMonthly as an
// independent count cap on top of credits — a user with plenty of credits left
// could still get "The monthly presentation limit has been reached" purely because
// they'd generated a fixed number of presentations that month, unrelated to their
// actual credit balance. Same fix already applied to University Hub — see
// checkUniversityFeatureLimit below for the original rationale.
// presentationsMonthly<=0 is kept as a plan *access* gate (FREE tier doesn't get
// the feature at all), and the slide-count cap is a per-request size limit, not a
// usage-rate limit — neither of those is what credits are supposed to replace.
export async function checkPresentationLimit(userId: string, tier: SubscriptionTier, slideCount: number) {
  const entitlement = await getAudiencePlanLimits(userId, tier);
  if (entitlement.limits.presentationsMonthly <= 0 || slideCount > entitlement.limits.presentationSlidesMax) {
    return {
      success: false,
      remaining: 0,
      reset: monthWindow().reset,
      maxSlides: entitlement.limits.presentationSlidesMax,
      audience: entitlement.audience,
    };
  }
  return {
    success: true,
    remaining: -1,
    reset: 0,
    maxSlides: entitlement.limits.presentationSlidesMax,
    audience: entitlement.audience,
  };
}

// File Summary / File Test tools: same fix as Presentation Builder above — these
// routes already gate on the shared AI credit pool separately (checkAiMessageLimit
// + consumeAiCredits), so the extra monthly count cap here was pure redundant
// double-gating that could block a user with credits still remaining.
async function checkAudienceFileLimit(_userId: string, _tier: SubscriptionTier, _feature: 'file_summary' | 'file_test') {
  return { success: true, remaining: -1, reset: 0 };
}

export async function checkFileSummaryLimit(userId: string, tier: SubscriptionTier) {
  return checkAudienceFileLimit(userId, tier, 'file_summary');
}

export async function checkFileTestLimit(userId: string, tier: SubscriptionTier) {
  return checkAudienceFileLimit(userId, tier, 'file_test');
}

export async function checkUniversityHubLimit(userId: string, tier: SubscriptionTier) {
  const plan = await getConfiguredPlan(tier);
  return checkWeeklyLimit(userId, 'university_hub', plan.limits.universityHubWeekly);
}

// University Hub is fully credit-gated: the shared AI credit pool is the only thing that governs
// access here now. This used to ALSO enforce plan.limits.universityHubWeekly as an independent
// cap on top of credits — a FREE user with most of their weekly credit balance untouched could
// still get blocked with an "upgrade" message just because they'd already used a small fixed
// number of University Hub actions that week, unrelated to how many credits they had left.
export async function checkUniversityFeatureLimit(userId: string, tier: SubscriptionTier, featureKey: string) {
  const credits = await checkSharedAiLimit(userId, tier, featureKey);
  return { ...credits, scope: 'daily' as const };
}

export async function consumeUniversityFeatureCredits(userId: string, tier: SubscriptionTier, featureKey: string) {
  const credits = await consumeSharedAiCredits(userId, tier, featureKey);
  return { ...credits, scope: 'daily' as const };
}

export async function getUniversityLimitExceededMessage(
  tier: SubscriptionTier,
  scope: 'weekly' | 'daily',
  featureLabel: string
) {
  if (scope === 'daily') return getConfiguredLimitExceededMessage(tier, featureLabel);
  const plan = await getConfiguredPlan(tier);
  return `The weekly University Hub limit for ${featureLabel} (${plan.limits.universityHubWeekly}) has been reached. It resets next Monday.`;
}

export async function checkModelTierLimit(
  userId: string,
  provider: string,
  modelTier: 'mini' | 'medium' | 'pro',
  userTier: SubscriptionTier = 'PRO'
) {
  void provider;
  void modelTier;
  const plan = await getConfiguredPlan(userTier);
  if (userTier !== 'ELITE' || plan.limits.premiumAiMonthly <= 0) {
    return { success: false, remaining: 0, reset: monthWindow().reset };
  }
  return checkMonthlyLimit(userId, 'premium_ai', plan.limits.premiumAiMonthly);
}

export async function checkParentAttachmentLimits(userId: string, tier: SubscriptionTier, fileSizeBytes: number) {
  const plan = await getConfiguredPlan(tier);
  const month = monthWindow();
  const byteLimit = Math.max(0, plan.limits.parentAttachmentMegabytesMonthly) * 1024 * 1024;
  return consumeStoredWeightedWindows([
    {
      key: `ratelimit:parent_attachment_file:${userId}:month:${month.key}`,
      limit: plan.limits.parentAttachmentFilesMonthly,
      resetAt: month.reset,
      amount: 1,
    },
    {
      key: `ratelimit:parent_attachment_bytes:${userId}:month:${month.key}`,
      limit: byteLimit,
      resetAt: month.reset,
      amount: fileSizeBytes,
    },
  ]);
}

export async function checkLiveVoiceLimit(userId: string, tier: SubscriptionTier) {
  const plan = await getConfiguredPlan(tier);
  if (!plan.access.liveVoice) return { success: false, remaining: 0, reset: 0 };
  return checkDailyLimit(userId, 'live_voice_call', plan.limits.liveVoiceDaily);
}

export function getDefaultAudienceLimits(tier: SubscriptionTier, audience: PlanAudience) {
  return DEFAULT_PLATFORM_SETTINGS.subscriptionPlans[tier].audienceLimits[audience];
}
