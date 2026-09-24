import { createClient } from 'redis';

type AppRedisClient = ReturnType<typeof createClient>;

const globalRedis = globalThis as typeof globalThis & {
  ilmRedisClient?: AppRedisClient;
  ilmRedisConnectPromise?: Promise<AppRedisClient | null>;
};

export function isRedisConfigured() {
  return Boolean(process.env.REDIS_URL);
}

export async function getRedisClient(): Promise<AppRedisClient | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (globalRedis.ilmRedisClient?.isReady) return globalRedis.ilmRedisClient;
  if (globalRedis.ilmRedisConnectPromise) return globalRedis.ilmRedisConnectPromise;

  const client = globalRedis.ilmRedisClient || createClient({ url });
  globalRedis.ilmRedisClient = client;
  client.on('error', (error) => console.error('Redis connection error:', error.message));

  globalRedis.ilmRedisConnectPromise = client
    .connect()
    .then(() => client)
    .catch((error) => {
      console.error('Redis unavailable, using the single-process fallback:', error);
      globalRedis.ilmRedisClient = undefined;
      return null;
    })
    .finally(() => {
      globalRedis.ilmRedisConnectPromise = undefined;
    });

  return globalRedis.ilmRedisConnectPromise;
}

const FIXED_WINDOW_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIREAT', KEYS[1], ARGV[1])
end
return count
`;

export async function incrementRedisWindow(key: string, resetAt: number): Promise<number | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const result = await redis.eval(FIXED_WINDOW_SCRIPT, {
    keys: [key],
    arguments: [String(resetAt)],
  });
  return Number(result);
}

const MULTI_WINDOW_SCRIPT = `
local amount = tonumber(ARGV[1])
for index = 1, #KEYS do
  local limit = tonumber(ARGV[index * 2])
  local current = tonumber(redis.call('GET', KEYS[index]) or '0')
  if current + amount > limit then
    return {0, index, current}
  end
end

local result = {1}
for index = 1, #KEYS do
  local resetAt = tonumber(ARGV[index * 2 + 1])
  local count = redis.call('INCRBY', KEYS[index], amount)
  if count == amount and resetAt > 0 then
    redis.call('PEXPIREAT', KEYS[index], resetAt)
  end
  table.insert(result, count)
end
return result
`;

export type RedisQuotaWindow = {
  key: string;
  limit: number;
  resetAt: number;
};

export async function consumeRedisWindows(
  windows: RedisQuotaWindow[],
  amount = 1
): Promise<{ allowed: boolean; counts: number[]; blockedIndex?: number } | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  if (!windows.length) return { allowed: true, counts: [] };

  const result = (await redis.eval(MULTI_WINDOW_SCRIPT, {
    keys: windows.map((window) => window.key),
    arguments: [
      String(amount),
      ...windows.flatMap((window) => [String(window.limit), String(window.resetAt)]),
    ],
  })) as Array<number | string>;

  const values = Array.isArray(result) ? result.map(Number) : [];
  if (values[0] === 0) {
    return {
      allowed: false,
      blockedIndex: Math.max(0, (values[1] || 1) - 1),
      counts: [values[2] || 0],
    };
  }
  return { allowed: true, counts: values.slice(1) };
}

const WEIGHTED_MULTI_WINDOW_SCRIPT = `
for index = 1, #KEYS do
  local offset = (index - 1) * 3
  local limit = tonumber(ARGV[offset + 1])
  local amount = tonumber(ARGV[offset + 3])
  local current = tonumber(redis.call('GET', KEYS[index]) or '0')
  if current + amount > limit then
    return {0, index, current}
  end
end

local result = {1}
for index = 1, #KEYS do
  local offset = (index - 1) * 3
  local resetAt = tonumber(ARGV[offset + 2])
  local amount = tonumber(ARGV[offset + 3])
  local count = redis.call('INCRBY', KEYS[index], amount)
  if count == amount and resetAt > 0 then
    redis.call('PEXPIREAT', KEYS[index], resetAt)
  end
  table.insert(result, count)
end
return result
`;

export type WeightedRedisQuotaWindow = RedisQuotaWindow & { amount: number };

export async function consumeRedisWeightedWindows(
  windows: WeightedRedisQuotaWindow[]
): Promise<{ allowed: boolean; counts: number[]; blockedIndex?: number } | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  if (!windows.length) return { allowed: true, counts: [] };

  const result = (await redis.eval(WEIGHTED_MULTI_WINDOW_SCRIPT, {
    keys: windows.map((window) => window.key),
    arguments: windows.flatMap((window) => [String(window.limit), String(window.resetAt), String(window.amount)]),
  })) as Array<number | string>;
  const values = Array.isArray(result) ? result.map(Number) : [];
  if (values[0] === 0) {
    return {
      allowed: false,
      blockedIndex: Math.max(0, (values[1] || 1) - 1),
      counts: [values[2] || 0],
    };
  }
  return { allowed: true, counts: values.slice(1) };
}

export async function scanRedisKeys(patterns: string[], maximum = 500): Promise<string[]> {
  const redis = await getRedisClient();
  if (!redis) return [];
  const found = new Set<string>();

  for (const pattern of patterns) {
    const iterator = redis.scanIterator({ MATCH: pattern, COUNT: 100 }) as AsyncIterable<string | string[]>;
    for await (const entry of iterator) {
      const keys = Array.isArray(entry) ? entry : [entry];
      keys.forEach((key) => found.add(String(key)));
      if (found.size >= maximum) return [...found].slice(0, maximum);
    }
  }

  return [...found].slice(0, maximum);
}

export async function getRedisCounter(key: string): Promise<number | null> {
  const redis = await getRedisClient();
  if (!redis) return null;
  const value = await redis.get(key);
  return value === null ? 0 : Number(value);
}
