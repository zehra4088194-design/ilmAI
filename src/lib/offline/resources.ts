'use client';

import type { ProtectedResourceKind, ResourceMode } from '@/lib/resources/server';

const DB_NAME = 'ilm-ai-offline';
const STORE_NAME = 'protected-resources';
const DB_VERSION = 1;
const CACHE_NAME = 'ilm-ai-offline-files-v2';

export type OfflineResource = {
  key: string;
  resourceId: string;
  kind: ProtectedResourceKind;
  mode: ResourceMode;
  title: string;
  mimeType: string;
  blob?: Blob;
  savedAt: string;
};

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

export function offlineResourceKey(kind: ProtectedResourceKind, resourceId: string, mode: ResourceMode) {
  return `${kind}:${resourceId}:${mode}`;
}

export async function saveOfflineResource(item: Omit<OfflineResource, 'key'>) {
  const value: OfflineResource = { ...item, key: offlineResourceKey(item.kind, item.resourceId, item.mode) };
  await transact('readwrite', (store) => store.put(value));
  return value;
}

function cacheRequest(key: string) {
  return new Request(`/__ilm-ai-offline/${encodeURIComponent(key)}`, { method: 'GET' });
}

export async function saveOfflineResourceResponse(
  item: Omit<OfflineResource, 'key' | 'blob' | 'mimeType'>,
  response: Response
) {
  const mimeType = response.headers.get('content-type') || 'application/pdf';
  const key = offlineResourceKey(item.kind, item.resourceId, item.mode);
  const blob = await response.blob();
  const value: OfflineResource = { ...item, key, mimeType, blob };

  await transact('readwrite', (store) => store.put(value));
  if (typeof caches === 'undefined') return value;

  const cache = await caches.open(CACHE_NAME);
  const request = cacheRequest(key);
  try {
    await cache.put(request, new Response(blob, { headers: { 'Content-Type': mimeType } }));
  } catch (error) {
    await cache.delete(request).catch(() => false);
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('Device storage is low. Remove older Downloads and try again.');
    }
  }
  return value;
}

export async function getOfflineResourceBlob(item: OfflineResource) {
  if (item.blob) return item.blob;
  if (typeof caches === 'undefined') throw new Error('Offline file storage is not available in this browser.');
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(cacheRequest(item.key));
  if (!response) throw new Error('Offline file is missing. Save it again from Library.');
  return response.blob();
}

export async function listOfflineResources() {
  return transact<OfflineResource[]>('readonly', (store) => store.getAll());
}

export async function deleteOfflineResource(key: string) {
  await transact('readwrite', (store) => store.delete(key));
  if (typeof caches !== 'undefined') {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(cacheRequest(key));
  }
}

export async function clearOfflineResources() {
  await transact('readwrite', (store) => store.clear());
  if (typeof caches !== 'undefined') await caches.delete(CACHE_NAME);
}
