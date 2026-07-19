import { createHash, randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import { incrementRedisWindow } from '@/lib/redis/client';

export const DEMO_ATTEMPTS_PER_DAY = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

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
  const now = new Date();
  const reset = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const key = `demo_attempt:${ipHash}:${now.toISOString().slice(0, 10)}`;
  try {
    const count = await incrementRedisWindow(`ilm-ai:${key}`, reset);
    if (count !== null) {
      return {
        success: count <= DEMO_ATTEMPTS_PER_DAY,
        remaining: Math.max(0, DEMO_ATTEMPTS_PER_DAY - count),
        reset,
        ipHash,
      };
    }
  } catch (error) {
    console.error('Redis demo rate-limit operation failed:', error);
  }
  return { ...checkMemoryLimit(key, DEMO_ATTEMPTS_PER_DAY), ipHash };
}
