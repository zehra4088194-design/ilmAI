import { Metadata } from 'next';
import { Redis } from '@upstash/redis';
import { Activity, Bot, CheckCircle2, Database, Gauge, ShieldAlert, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createAdminClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';

export const metadata: Metadata = { title: 'Admin - AI Usage' };

type RedisStats = {
  connected: boolean;
  error: string | null;
  keys: string[];
  totalUsage: number;
  byFeature: Record<string, number>;
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
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { connected: false, error: null, keys: [], totalUsage: 0, byFeature: {} };
  }

  try {
    const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
    const today = new Date().toISOString().slice(0, 10);
    const patterns = [`*ilm-ai*${today}*`, `*ratelimit*${today}*`];
    const found = await Promise.all(patterns.map((pattern) => redis.keys(pattern).catch(() => [] as string[])));
    const keys = Array.from(new Set(found.flat())).slice(0, 500);
    const values = await Promise.all(keys.map((key) => redis.get(key).catch(() => 0)));
    const byFeature: Record<string, number> = {};
    let totalUsage = 0;

    keys.forEach((key, index) => {
      const amount = numericValue(values[index]) || 1;
      const feature = featureFromKey(key);
      byFeature[feature] = (byFeature[feature] || 0) + amount;
      totalUsage += amount;
    });

    return { connected: true, error: null, keys, totalUsage, byFeature };
  } catch (error) {
    return { connected: false, error: error instanceof Error ? error.message : 'Redis read failed', keys: [], totalUsage: 0, byFeature: {} };
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
        <p className="mt-1 text-sm text-muted-foreground">Live Redis counters, subscription limits, and AI feedback data.</p>
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
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-400" />Daily Limits</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              ['Free', free.limits.aiToolDaily, free.limits.aiSideChatDaily],
              ['Pro', pro.limits.aiToolDaily, pro.limits.aiSideChatDaily],
              ['Elite', elite.limits.aiToolDaily, elite.limits.aiSideChatDaily],
            ].map(([tier, tool, chat]) => (
              <div key={tier} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tier}</span>
                  <Badge variant="secondary">{(tierCounts[String(tier).toUpperCase()] || 0).toLocaleString()} users</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">AI tools {tool}/day · side chat {chat}/day</p>
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
                Aaj abhi koi Redis usage counter nahi mila. Pehla AI/tool request hote hi yahan live count aa jayega.
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
    </div>
  );
}
