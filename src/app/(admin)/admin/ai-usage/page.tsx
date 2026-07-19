import { Metadata } from 'next';
import { Activity, Bot, CheckCircle2, Database, Gauge, ShieldAlert, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createAdminClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import { getRedisClient, isRedisConfigured, scanRedisKeys } from '@/lib/redis/client';

export const metadata: Metadata = { title: 'Admin - AI Usage' };
export const dynamic = 'force-dynamic';

type RedisStats = {
  connected: boolean;
  error: string | null;
  keys: string[];
  totalUsage: number;
  byFeature: Record<string, number>;
  sampleKeys: { key: string; amount: number; ttl: number | null }[];
};

function featureFromKey(key: string) {
  const lower = key.toLowerCase();
  if (lower.includes('side_chat')) return 'Side chat';
  if (lower.includes('ai_tool:')) return key.split('ai_tool:')[1]?.split(':')[0]?.replace(/_/g, ' ') || 'AI tool';
  if (lower.includes('model_tier')) return 'Premium model';
  if (lower.includes('quiz')) return 'Quiz/testing';
  if (lower.includes('ocr') || lower.includes('vision')) return 'OCR/vision';
  if (lower.includes('voice')) return 'Voice';
  return 'Other';
}

function numericValue(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (value && typeof value === 'object' && 'count' in value) return Number((value as { count?: unknown }).count) || 0;
  return 0;
}

async function getRedisStats(): Promise<RedisStats> {
  if (!isRedisConfigured()) {
    return { connected: false, error: null, keys: [], totalUsage: 0, byFeature: {}, sampleKeys: [] };
  }

  try {
    const redis = await getRedisClient();
    if (!redis) return { connected: false, error: 'Redis connection unavailable', keys: [], totalUsage: 0, byFeature: {}, sampleKeys: [] };
    const today = new Date().toISOString().slice(0, 10);
    const patterns = [
      `*ilm-ai*${today}*`,
      `*ratelimit*${today}*`,
      `*${today}*`,
      '*ilm-ai*',
      '*ratelimit*',
      '*ai_tool*',
      '*model_tier*',
    ];
    const allKeys = await scanRedisKeys(patterns, 800);
    const ttlPairs = await Promise.all(allKeys.slice(0, 800).map(async (key) => ({ key, ttl: await redis.ttl(key).catch(() => null) })));
    const keys = ttlPairs
      .filter((item) => item.ttl === null || item.ttl > 0)
      .map((item) => item.key)
      .slice(0, 500);
    const values = keys.length ? await redis.mGet(keys) : [];
    const ttlMap = new Map(ttlPairs.map((item) => [item.key, item.ttl]));
    const byFeature: Record<string, number> = {};
    let totalUsage = 0;

    keys.forEach((key, index) => {
      const amount = numericValue(values[index]) || 1;
      const feature = featureFromKey(key);
      byFeature[feature] = (byFeature[feature] || 0) + amount;
      totalUsage += amount;
    });

    return {
      connected: true,
      error: null,
      keys,
      totalUsage,
      byFeature,
      sampleKeys: keys.slice(0, 12).map((key, index) => ({ key, amount: numericValue(values[index]) || 1, ttl: ttlMap.get(key) ?? null })),
    };
  } catch (error) {
    return { connected: false, error: error instanceof Error ? error.message : 'Redis read failed', keys: [], totalUsage: 0, byFeature: {}, sampleKeys: [] };
  }
}

async function safeCount(db: Awaited<ReturnType<typeof createAdminClient>>, table: string) {
  const { count } = await (db.from(table as any) as any).select('id', { count: 'exact', head: true });
  return count ?? 0;
}

export default async function AdminAiUsagePage() {
  const db = await createAdminClient();
  const settings = await getPlatformSettings();
  const redisStats = await getRedisStats();
  const [profilesRes, feedbackCount] = await Promise.all([
    db.from('profiles').select('subscription_tier').limit(10000),
    safeCount(db, 'ai_answer_feedback'),
  ]);

  const profiles = profilesRes.data || [];
  const tierCounts = profiles.reduce<Record<string, number>>((acc, row) => {
    const tier = String(row.subscription_tier || 'FREE').toUpperCase();
    acc[tier] = (acc[tier] || 0) + 1;
    return acc;
  }, {});

  const free = getPlanFromSettings(settings, 'FREE');
  const pro = getPlanFromSettings(settings, 'PRO');
  const elite = getPlanFromSettings(settings, 'ELITE');
  const featureRows = Object.entries(redisStats.byFeature).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Usage Monitoring</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live private Valkey counters, subscription limits, and AI feedback data.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="mb-1 text-xs text-muted-foreground">Rate Limit Store</p>
            <div className="flex items-center gap-2">
              {redisStats.connected ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <ShieldAlert className="h-5 w-5 text-amber-500" />}
              <p className="text-2xl font-bold">{redisStats.connected ? 'Connected' : 'Unavailable'}</p>
            </div>
            {redisStats.error && <p className="mt-1 text-xs text-destructive">{redisStats.error}</p>}
          </CardContent>
        </Card>
        <Card><CardContent className="p-5"><Gauge className="mb-3 h-5 w-5 text-violet-400" /><p className="text-xs text-muted-foreground mb-1">Today Usage</p><p className="text-2xl font-bold">{redisStats.totalUsage.toLocaleString()}</p><p className="text-xs text-muted-foreground">{redisStats.keys.length} live Redis keys</p></CardContent></Card>
        <Card><CardContent className="p-5"><Bot className="mb-3 h-5 w-5 text-cyan-400" /><p className="text-xs text-muted-foreground mb-1">AI Feedback</p><p className="text-2xl font-bold">{feedbackCount.toLocaleString()}</p><p className="text-xs text-muted-foreground">student helpful/not-helpful votes</p></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-400" />Shared AI Limits</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              ['Free', free.limits.aiCreditsWeekly, free.limits.aiCreditsWeekly],
              ['Pro', pro.limits.aiCreditsDaily, pro.limits.aiCreditsMonthly],
              ['Elite', elite.limits.aiCreditsDaily, elite.limits.aiCreditsMonthly],
            ].map(([tier, daily, monthly]) => (
              <div key={tier} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tier}</span>
                  <Badge variant="secondary">{(tierCounts[String(tier).toUpperCase()] || 0).toLocaleString()} users</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tier === 'Free' ? `${monthly}/week shared` : `${daily}/day, ${monthly}/month shared`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-emerald-400" />Today by Feature</CardTitle></CardHeader>
          <CardContent>
            {featureRows.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {featureRows.map(([feature, count]) => (
                  <div key={feature} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                    <span className="capitalize">{feature}</span>
                    <Badge variant="outline">{count.toLocaleString()}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
                No active Redis usage window was found. Live feature counts will appear after the first AI/tool request.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-400" />Tracked Pools</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <Badge variant="outline" className="justify-center py-2">AI tools/testing</Badge>
          <Badge variant="outline" className="justify-center py-2">Side chat</Badge>
          <Badge variant="outline" className="justify-center py-2">Vision/OCR</Badge>
          <Badge variant="outline" className="justify-center py-2">Voice</Badge>
          <Badge variant="outline" className="justify-center py-2">Premium models</Badge>
          <Badge variant="outline" className="justify-center py-2">Quiz/testing</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Live Redis Keys</CardTitle></CardHeader>
        <CardContent>
          {redisStats.sampleKeys.length ? (
            <div className="space-y-2">
              {redisStats.sampleKeys.map((item) => (
                <div key={item.key} className="grid gap-2 rounded-lg border border-border/60 p-3 text-sm md:grid-cols-[1fr,90px,110px]">
                  <code className="truncate text-xs text-muted-foreground">{item.key}</code>
                  <Badge variant="outline" className="justify-center">{item.amount.toLocaleString()}</Badge>
                  <Badge variant="secondary" className="justify-center">TTL {item.ttl === null || item.ttl < 0 ? '-' : `${Math.round(item.ttl / 3600)}h`}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
              {redisStats.connected
                ? 'Valkey is connected, but no active daily usage keys were found. The key list will appear after the first AI/tool request.'
                : redisStats.error || 'Private Valkey environment variables are missing or unavailable.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
