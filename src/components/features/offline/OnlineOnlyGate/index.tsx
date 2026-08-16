'use client';

import type { ReactNode } from 'react';
import { useOnlineStatus } from '@/hooks/offline/useOnlineStatus';
import { OfflineNotice } from '@/components/features/offline/OfflineNotice';

/**
 * Wraps a feature that genuinely cannot work offline (AI tutor chat, live
 * quiz sessions, vision/OCR, voice, checkout — see
 * src/lib/offline/online-only.ts) and swaps it for the OfflineNotice banner
 * while the browser is offline, instead of letting the feature hang or throw
 * a raw network error.
 */
export function OnlineOnlyGate({
  feature,
  description,
  className,
  children,
}: {
  feature: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  const isOnline = useOnlineStatus();
  if (!isOnline) return <OfflineNotice feature={feature} description={description} className={className} />;
  return <>{children}</>;
}
