import 'server-only';

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzip, gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { getRedisClient } from '@/lib/redis/client';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const CACHE_VERSION = 'v1';
const MEMORY_TTL_MS = 5 * 60 * 1000;
const REDIS_TTL_SECONDS = 6 * 60 * 60;
const cacheRoot = process.env.AI_ARTIFACTS_PATH || path.join(process.cwd(), 'data', 'ai-artifacts');

type MemoryEntry = { expiresAt: number; value: unknown };
const memory = new Map<string, MemoryEntry>();

export function hashArtifactInput(value: unknown) {
  return createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');
}

export function createArtifactKey(namespace: string, input: unknown) {
  const safeNamespace =
    namespace
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .slice(0, 48) || 'artifact';
  return `${safeNamespace}:${CACHE_VERSION}:${hashArtifactInput(input)}`;
}

function artifactPath(key: string) {
  const [namespace = 'artifact', version = CACHE_VERSION, digest = hashArtifactInput(key)] = key.split(':');
  return path.join(cacheRoot, namespace, version, digest.slice(0, 2), `${digest}.json.gz`);
}

function remember<T>(key: string, value: T) {
  memory.set(key, { expiresAt: Date.now() + MEMORY_TTL_MS, value });
}

export async function readAiArtifact<T>(key: string, options: { hot?: boolean } = {}): Promise<T | null> {
  if (options.hot !== false) {
    const local = memory.get(key);
    if (local && local.expiresAt > Date.now()) return local.value as T;
    if (local) memory.delete(key);
  }

  if (options.hot !== false)
    try {
      const redis = await getRedisClient();
      const hot = await redis?.get(`ai-artifact:${key}`);
      if (hot) {
        const parsed = JSON.parse(hot) as T;
        remember(key, parsed);
        return parsed;
      }
    } catch (error) {
      console.warn('AI artifact hot-cache read failed:', error);
    }

  try {
    const compressed = await readFile(artifactPath(key));
    const parsed = JSON.parse((await gunzipAsync(compressed)).toString('utf8')) as T;
    if (options.hot !== false) remember(key, parsed);
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') console.warn('AI artifact disk read failed:', error);
    return null;
  }
}

export async function writeAiArtifact<T>(key: string, value: T, options: { hot?: boolean } = {}): Promise<void> {
  const target = artifactPath(key);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(value);
  try {
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(temporary, await gzipAsync(Buffer.from(payload), { level: 9 }));
    await rename(temporary, target);
    if (options.hot !== false) remember(key, value);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    console.error('AI artifact disk write failed:', error);
    return;
  }

  if (options.hot !== false)
    try {
      const redis = await getRedisClient();
      await redis?.set(`ai-artifact:${key}`, payload, { EX: REDIS_TTL_SECONDS });
    } catch (error) {
      console.warn('AI artifact hot-cache write failed:', error);
    }
}
