// ============================================
// RATE LIMITING (Upstash Redis)
// Used for: AI messages/day, quizzes/day, OCR scans/day, live voice calls/day
// — all tier-based limits
// ============================================
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import type { SubscriptionTier } from '@/types';

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
  : null;

// In-memory fallback for local dev when Upstash isn't configured
const memoryStore = new Map<string, { count: number; resetAt: number }>();

async function checkMemoryLimit(key: string, limit: number, windowMs: number): Promise<{ success: boolean; remaining: number; reset: number }> {
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

/** Generic daily limiter, used for AI messages, quizzes, OCR scans, and live voice calls. */
export async function checkDailyLimit(userId: string, feature: 'ai_message' | 'quiz' | 'ocr_scan' | 'live_voice_call', limit: number): Promise<{ success: boolean; remaining: number; reset: number }> {
  const key = `ratelimit:${feature}:${userId}:${new Date().toISOString().slice(0, 10)}`;

  if (redis) {
    const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(limit, '1 d'), prefix: 'ilm-ai' });
    const result = await ratelimit.limit(key);
    return { success: result.success, remaining: result.remaining, reset: result.reset };
  }
  return checkMemoryLimit(key, limit, DAY_MS);
}

/** OCR-specific helper: Free = 5/day, Pro = 10/day, Elite = 30/day. */
export async function checkOcrLimit(userId: string, tier: SubscriptionTier) {
  const limit = tier === 'ELITE' ? 30 : tier === 'PRO' ? 10 : 5;
  return checkDailyLimit(userId, 'ocr_scan', limit);
}

/** AI chat messages, tied to subscription plan limits */
export async function checkAiMessageLimit(userId: string, tier: SubscriptionTier) {
  const limit = SUBSCRIPTION_PLANS[tier].limits.aiMessages;
  if (limit === -1) return { success: true, remaining: -1, reset: 0 }; // unlimited
  return checkDailyLimit(userId, 'ai_message', limit);
}

export async function checkQuizLimit(userId: string, tier: SubscriptionTier) {
  const limit = SUBSCRIPTION_PLANS[tier].limits.quizzes;
  if (limit === -1) return { success: true, remaining: -1, reset: 0 };
  return checkDailyLimit(userId, 'quiz', limit);
}

// ============================================
// PREMIUM AI MODEL TIER LIMITS (Pro/Elite only)
// Claude, GPT, and Gemini cost real money per call, so even paid users
// get a small daily allowance per model SIZE (not per provider):
// mini -> 10 calls/day (cheap small models)
// medium -> 7 calls/day (mid-size models)
// pro -> 3 calls/day (largest/most expensive models)
// Groq is unmetered here — it uses the normal AI-message pool instead,
// since it's fast/cheap enough to treat as the "default" provider.
// ============================================
const MODEL_TIER_DAILY_LIMITS: Record<'mini' | 'medium' | 'pro', number> = {
  mini: 10,
  medium: 7,
  pro: 3,
};

export async function checkModelTierLimit(userId: string, provider: string, tier: 'mini' | 'medium' | 'pro') {
  const limit = MODEL_TIER_DAILY_LIMITS[tier] ?? 5;
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
// LIVE VOICE CALL (Elite only — real Gemini audio session cost per call)
// Elite: 15 calls/day. FREE and PRO never reach this check (blocked earlier
// in the API route by the Elite-only tier gate), but it's handled safely
// here too in case that check ever changes.
// ============================================
const LIVE_VOICE_DAILY_LIMIT_ELITE = 15;

export async function checkLiveVoiceLimit(userId: string, tier: SubscriptionTier) {
  if (tier !== 'ELITE') return { success: false, remaining: 0, reset: 0 };
  return checkDailyLimit(userId, 'live_voice_call', LIVE_VOICE_DAILY_LIMIT_ELITE);
}
