import { createHash, randomBytes } from 'crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

export const DEMO_ATTEMPTS_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN! })
  : null;

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function checkMemoryLimit(key: string, limit: number) {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + DAY_MS });
    return { success: true, remaining: limit - 1, reset: now + DAY_MS };
  }
  if (entry.count >= limit) return { success: false, remaining: 0, reset: entry.resetAt };
  entry.count += 1;
  return { success: true, remaining: limit - entry.count, reset: entry.resetAt };
}

export function getRequestIp(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || '127.0.0.1';
}

export function hashDemoIp(ip: string) {
  const salt = process.env.DEMO_RATE_LIMIT_SALT || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'ilm-ai-demo-salt';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export function createDemoSessionToken() {
  return randomBytes(32).toString('hex');
}

export async function checkDemoRateLimit(req: NextRequest) {
  const ipHash = hashDemoIp(getRequestIp(req));
  const key = `demo_attempt:${ipHash}:${new Date().toISOString().slice(0, 10)}`;
  if (redis) {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(DEMO_ATTEMPTS_PER_DAY, '1 d'),
      prefix: 'ilm-ai',
    });
    const result = await ratelimit.limit(key);
    return { success: result.success, remaining: result.remaining, reset: result.reset, ipHash };
  }
  return { ...checkMemoryLimit(key, DEMO_ATTEMPTS_PER_DAY), ipHash };
}
