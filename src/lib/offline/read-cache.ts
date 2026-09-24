'use client';

/**
 * Generic "keep a local copy of what the server last sent" cache. This is the WhatsApp-style
 * half of offline support: `src/lib/offline/sync-queue.ts` is the outbox (things the user wrote
 * while offline, replayed later); this file is the inbox mirror (things the server has already
 * sent this device, kept around so they're still there with no network at all).
 *
 * Pattern for any list/detail fetch that should survive going offline:
 *
 *   const items = await fetchWithOfflineCache(`presentations:history:${userId}`, () =>
 *     fetch('/api/presentation/history').then(r => r.json())
 *   );
 *
 * On a real network call it returns the live response AND mirrors it to IndexedDB. On a failed
 * call (offline, or the request itself threw) it falls back to whatever was last mirrored under
 * that key, if anything. Every key MUST include the signed-in user's id (or another scoping
 * value) — this store has no concept of "whose data is this", so an unscoped key would leak one
 * account's cached data to the next account signed into the same browser/device.
 *
 * Storage: IndexedDB (`ilm-ai-offline-reads` / `reads`), namespaced separately from the write
 * queue's own database so a bug in one can't corrupt the other.
 */

const DB_NAME = 'ilm-ai-offline-reads';
const STORE_NAME = 'reads';
const DB_VERSION = 1;

function hasIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Mirrors `data` under `key` for later offline reads. Silently no-ops if IndexedDB isn't available. */
export async function cacheRead(key: string, data: unknown): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ key, data, cachedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Best-effort only — a mirror failure should never break the live request it's shadowing.
  }
}

/** Reads back whatever was last mirrored under `key`, or null if nothing has been cached yet. */
export async function getCachedRead<T = unknown>(key: string): Promise<T | null> {
  if (!hasIndexedDb()) return null;
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve((request.result?.data as T) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export type OfflineCacheResult<T> = { data: T; fromCache: boolean };

/**
 * Runs `fetcher()`. On success, mirrors the result under `key` and returns it live
 * (`fromCache: false`). On failure, falls back to the last mirrored value for `key`
 * (`fromCache: true`) — re-throws only if there is nothing cached to fall back to, so a genuine
 * first-ever offline visit still surfaces as an error the caller can show a message for.
 */
export async function fetchWithOfflineCache<T>(key: string, fetcher: () => Promise<T>): Promise<OfflineCacheResult<T>> {
  try {
    const data = await fetcher();
    void cacheRead(key, data);
    return { data, fromCache: false };
  } catch (error) {
    const cached = await getCachedRead<T>(key);
    if (cached !== null) return { data: cached, fromCache: true };
    throw error;
  }
}
