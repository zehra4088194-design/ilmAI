'use client';

/**
 * Offline-first write queue (Phase 1b). Captures two write paths that a teacher/student can
 * trigger while the network is down — attendance marks and completed quiz sessions — and replays
 * them against /api/offline/sync once connectivity returns.
 *
 * Deliberately does NOT queue every mutation in the app: per docs/OFFLINE_SUPPORT.md and
 * src/lib/offline/online-only.ts, live quiz-taking, AI generation, and payments stay online-only by
 * design. A "quiz_complete" queue item is the same request /api/quiz/complete already accepts
 * (built entirely from client-held state after the student finishes) — this queue only defers that
 * one POST when it fails due to being offline, it does not change what gets awarded or when the
 * ledger write happens; it just lets the request survive a dropped connection instead of being lost.
 *
 * Storage: IndexedDB (works in the PWA's service-worker context and survives reloads); falls back
 * to an in-memory array (best-effort only, lost on reload) in environments without IndexedDB.
 */

export type OfflineQueueItemType = 'attendance' | 'quiz_complete' | 'notes_create' | 'notes_update';

export interface OfflineQueueItem {
  id: string;
  type: OfflineQueueItemType;
  payload: unknown;
  queuedAt: string;
}

const DB_NAME = 'ilm-ai-offline-queue';
const STORE_NAME = 'items';
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
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Memory fallback used only if IndexedDB is unavailable (e.g. some privacy modes).
let memoryFallback: OfflineQueueItem[] = [];

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function enqueueOfflineItem(type: OfflineQueueItemType, payload: unknown): Promise<OfflineQueueItem> {
  const item: OfflineQueueItem = { id: newId(), type, payload, queuedAt: new Date().toISOString() };
  if (!hasIndexedDb()) {
    memoryFallback.push(item);
    return item;
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return item;
}

export async function getQueuedItems(): Promise<OfflineQueueItem[]> {
  if (!hasIndexedDb()) return [...memoryFallback];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result || []) as OfflineQueueItem[]);
    request.onerror = () => reject(request.error);
  });
}

async function removeQueuedItem(id: string) {
  if (!hasIndexedDb()) {
    memoryFallback = memoryFallback.filter((item) => item.id !== id);
    return;
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export type SyncResult = { id: string; type: OfflineQueueItemType; ok: boolean; conflict?: boolean; error?: string };

let flushing: Promise<SyncResult[]> | null = null;

/**
 * Replays every queued item against /api/offline/sync, in the order it was captured. Stops
 * attempting further items only if the browser reports it's still offline; a per-item server
 * error (4xx/5xx) is treated as a permanent failure for that item — it's dropped rather than
 * retried forever, and surfaced in the returned result so the caller can toast it.
 */
export async function flushOfflineQueue(): Promise<SyncResult[]> {
  if (flushing) return flushing;
  flushing = (async () => {
    const results: SyncResult[] = [];
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return results;

    const items = await getQueuedItems();
    for (const item of items) {
      try {
        const res = await fetch('/api/offline/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, type: item.type, payload: item.payload, queuedAt: item.queuedAt }),
        });
        if (res.status === 0 || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
          // Network genuinely dropped mid-flush — leave this and remaining items queued.
          break;
        }
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          await removeQueuedItem(item.id);
          results.push({ id: item.id, type: item.type, ok: true, conflict: Boolean(json?.conflict) });
        } else {
          await removeQueuedItem(item.id);
          results.push({ id: item.id, type: item.type, ok: false, error: json?.error || `HTTP ${res.status}` });
        }
      } catch {
        // fetch threw -> treat as still offline, stop and retry the rest next time.
        break;
      }
    }
    return results;
  })();
  try {
    return await flushing;
  } finally {
    flushing = null;
  }
}

let listenersAttached = false;

/** Call once (e.g. from a root client layout) to auto-flush whenever the browser regains connectivity. */
export function attachOfflineQueueAutoFlush(onFlushed?: (results: SyncResult[]) => void) {
  if (typeof window === 'undefined' || listenersAttached) return;
  listenersAttached = true;

  const run = () => {
    flushOfflineQueue()
      .then((results) => {
        if (results.length && onFlushed) onFlushed(results);
      })
      .catch((error) => console.error('Offline queue flush failed:', error));
  };

  window.addEventListener('online', run);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') run();
  });
  if (navigator.onLine) run();
}
