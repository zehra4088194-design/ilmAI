'use client';

import { Phone } from 'lucide-react';
import { useCalling } from './CallProvider';
import type { InstitutionType } from '@/lib/calling/types';

/**
 * Small icon button that starts a voice call to `target`. Renders nothing when calling isn't
 * available at all (no CallProvider identity in the tree, e.g. a consumer-only page) — actual
 * permission (is this role pair, and is calling even enabled for the org) is re-checked
 * server-side by requestCallPermission() the moment the button is pressed, not just hidden here,
 * so a disallowed pair sees a clear inline reason instead of a silently-broken button.
 */
export function CallButton({
  institutionType,
  organizationId,
  target,
  className = '',
}: {
  institutionType: InstitutionType;
  organizationId: string;
  target: { userId: string; name: string; avatarUrl: string | null };
  className?: string;
}) {
  const calling = useCalling();
  if (!calling || !calling.identity || calling.identity.userId === target.userId) return null;

  const busy = calling.status !== 'idle';

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => calling.startCall(institutionType, organizationId, target)}
      title={busy ? 'Already on a call' : `Call ${target.name}`}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      aria-label={`Call ${target.name}`}
    >
      <Phone className="h-3.5 w-3.5" />
    </button>
  );
}
