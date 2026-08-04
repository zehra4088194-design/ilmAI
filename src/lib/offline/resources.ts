'use client';

import type { ProtectedResourceKind, ResourceMode } from '@/lib/resources/server';

const DB_NAME = 'ilm-ai-offline';
const STORE_NAME = 'protected-resources';
const DB_VERSION = 1;

export type OfflineResource = {
  key: string;
  resourceId: string;
  kind: ProtectedResourceKind;
  mode: ResourceMode;
  title: string;
  mimeType: string;
  sourceUrl?: string;
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

export async function saveOfflineResourceLink(
  item: Omit<OfflineResource, 'key' | 'blob' | 'mimeType'> & { sourceUrl: string }
) {
  if (!item.sourceUrl) throw new Error('This file does not have a usable link.');
  return saveOfflineResource({ ...item, mimeType: 'application/pdf' });
}

export async function saveOfflineResourceResponse(
  item: Omit<OfflineResource, 'key' | 'blob' | 'mimeType'>,
  response: Response
) {
  const mimeType = response.headers.get('content-type') || 'application/pdf';
  const key = offlineResourceKey(item.kind, item.resourceId, item.mode);
  const blob = await response.blob();
  const value: OfflineResource = { ...item, key, mimeType, blob };

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
  item: Omit<OfflineResource, 'key' | 'blob' | 'mimeType' | 'sourceUrl'>
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

export async function listOfflineResources() {
  return transact<OfflineResource[]>('readonly', (store) => store.getAll());
}

export async function deleteOfflineResource(key: string) {
  await transact('readwrite', (store) => store.delete(key));
}

export async function clearOfflineResources() {
  await transact('readwrite', (store) => store.clear());
}
