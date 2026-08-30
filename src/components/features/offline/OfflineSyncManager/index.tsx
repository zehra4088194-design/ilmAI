'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { attachOfflineQueueAutoFlush } from '@/lib/offline/sync-queue';

/**
 * Mounted once at the app root (see src/providers/index.tsx). Attaches the Phase 1b offline
 * queue's auto-flush listeners (browser 'online' event + tab regaining visibility) and surfaces a
 * toast once queued attendance/quiz writes have synced.
 */
export function OfflineSyncManager() {
  useEffect(() => {
    attachOfflineQueueAutoFlush((results) => {
      const succeeded = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok).length;
      if (succeeded) toast.success(`Synced ${succeeded} offline update${succeeded === 1 ? '' : 's'}.`);
      if (failed) toast.error(`${failed} offline update${failed === 1 ? '' : 's'} could not be synced.`);
    });
  }, []);

  return null;
}
