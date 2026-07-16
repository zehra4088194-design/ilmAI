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
  blob: Blob;
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
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error);
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

export async function listOfflineResources() {
  return transact<OfflineResource[]>('readonly', (store) => store.getAll());
}

export async function deleteOfflineResource(key: string) {
  await transact('readwrite', (store) => store.delete(key));
}

export async function clearOfflineResources() {
  await transact('readwrite', (store) => store.clear());
}
