'use client';

import type { ProtectedResourceKind, ResourceMode } from '@/lib/resources/server';
import { useAuthStore } from '@/store/auth.store';

const DB_NAME = 'ilm-ai-offline';
const STORE_NAME = 'protected-resources';
const DB_VERSION = 1;
// Falls back to a fixed bucket only for the (practically unreachable, since every
// save flow requires a signed-in user) case where no user is loaded yet.
const ANONYMOUS_USER = 'anonymous';

export type OfflineResource = {
  key: string;
  userId: string;
  resourceId: string;
  kind: ProtectedResourceKind;
  mode: ResourceMode;
  title: string;
  mimeType: string;
  sourceUrl?: string;
  blob?: Blob;
  savedAt: string;
};

function currentUserId() {
  return useAuthStore.getState().user?.id || ANONYMOUS_USER;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = run(transaction.objectStore(STORE_NAME));
    let result: T;
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('Offline storage transaction was aborted.'));
    };
  });
}

/**
 * Record key, scoped to the currently signed-in user. IndexedDB is scoped
 * per-browser-origin, not per-app-account, so without the user-id prefix two
 * different Ilm AI accounts sharing a device/browser would see and be able to
 * open each other's saved offline files. Records saved before this scoping
 * existed simply won't match any current key and stop appearing — they're
 * re-downloadable cache data, not something that needs migrating.
 */
export function offlineResourceKey(kind: ProtectedResourceKind, resourceId: string, mode: ResourceMode) {
  return `${currentUserId()}:${kind}:${resourceId}:${mode}`;
}

export async function saveOfflineResource(item: Omit<OfflineResource, 'key' | 'userId'>) {
  const userId = currentUserId();
  const value: OfflineResource = {
    ...item,
    userId,
    key: offlineResourceKey(item.kind, item.resourceId, item.mode),
  };
  await transact('readwrite', (store) => store.put(value));
  return value;
}

export async function saveOfflineResourceLink(
  item: Omit<OfflineResource, 'key' | 'userId' | 'blob' | 'mimeType'> & { sourceUrl: string }
) {
  if (!item.sourceUrl) throw new Error('This file does not have a usable link.');
  return saveOfflineResource({ ...item, mimeType: 'application/pdf' });
}

export async function saveOfflineResourceResponse(
  item: Omit<OfflineResource, 'key' | 'userId' | 'blob' | 'mimeType'>,
  response: Response
) {
  const mimeType = response.headers.get('content-type') || 'application/pdf';
  const userId = currentUserId();
  const key = offlineResourceKey(item.kind, item.resourceId, item.mode);
  const blob = await response.blob();
  const value: OfflineResource = { ...item, userId, key, mimeType, blob };

  try {
    await transact('readwrite', (store) => store.put(value));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('Device storage is low. Remove older Downloads and try again.');
    }
    throw error;
  }
  return value;
}

/** Downloads through the authenticated same-origin proxy into app-private browser storage. */
export async function saveProtectedResourceOffline(
  item: Omit<OfflineResource, 'key' | 'userId' | 'blob' | 'mimeType' | 'sourceUrl'>
) {
  const response = await fetch('/api/resources/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: item.kind, id: item.resourceId, mode: item.mode, purpose: 'offline' }),
  });
  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new Error(json?.error || 'The file could not be saved inside the app.');
  }
  return saveOfflineResourceResponse(item, response);
}

export async function getOfflineResourceBlob(item: OfflineResource) {
  if (item.blob) return item.blob;
  throw new Error('Offline file is missing. Save it again from Library.');
}

/** Only ever returns the current user's saved items — see offlineResourceKey. */
export async function listOfflineResources() {
  const all = await transact<OfflineResource[]>('readonly', (store) => store.getAll());
  const userId = currentUserId();
  return all.filter((item) => item.userId === userId);
}

export async function deleteOfflineResource(key: string) {
  await transact('readwrite', (store) => store.delete(key));
}

/** Clears only the current user's saved items, never another account's files on a shared device. */
export async function clearOfflineResources() {
  const mine = await listOfflineResources();
  await Promise.all(mine.map((item) => deleteOfflineResource(item.key)));
}

/** Total bytes used by this browser's offline storage (all origin data, not just this store) and the device quota. */
export async function getOfflineStorageEstimate() {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  if (usage == null || quota == null) return null;
  return { usage, quota };
}
