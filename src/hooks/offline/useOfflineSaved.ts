'use client';

import { useCallback, useEffect, useState } from 'react';
import { listOfflineResources, offlineResourceKey } from '@/lib/offline/resources';
import type { ProtectedResourceKind, ResourceMode } from '@/lib/resources/server';

/**
 * Tracks whether a given resource is already saved in the offline Downloads
 * store, checking on mount so the "Save in app" button reflects prior saves
 * immediately — including after the browser was closed and reopened, not
 * just within the current session.
 */
export function useOfflineSaved(kind: ProtectedResourceKind, resourceId: string, mode: ResourceMode) {
  const [saved, setSaved] = useState(false);
  const [checked, setChecked] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const items = await listOfflineResources();
      const key = offlineResourceKey(kind, resourceId, mode);
      setSaved(items.some((item) => item.key === key));
    } catch {
      setSaved(false);
    } finally {
      setChecked(true);
    }
  }, [kind, resourceId, mode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { saved, checked, markSaved: () => setSaved(true), refresh };
}
