'use client';

import { Phone } from 'lucide-react';

/**
 * Person-to-person in-app voice calling is disabled. The directory now exposes the person's
 * saved phone number and this link hands the number to the device's normal phone/dialer app.
 * No microphone, PeerJS, Supabase Realtime, or web-call session is started here.
 */
export function CallButton({
  target,
  className = '',
}: {
  // Kept optional for compatibility with existing call sites while the old web-calling API is retired.
  institutionType?: string;
  organizationId?: string;
  target: { userId: string; name: string; avatarUrl: string | null; phone?: string | null };
  className?: string;
}) {
  const phone = target.phone?.trim() || '';
  const dialValue = phone.replace(/[^0-9+]/g, '');

  if (!dialValue) {
    return (
      <span
        title={`No phone number is available for ${target.name}`}
        className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}
        aria-label={`No phone number is available for ${target.name}`}
      >
        <Phone className="h-3.5 w-3.5" />
        No number
      </span>
    );
  }

  return (
    <a
      href={`tel:${dialValue}`}
      title={`Call ${target.name} at ${phone}`}
      aria-label={`Call ${target.name} at ${phone}`}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400 ${className}`}
    >
      <Phone className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{phone}</span>
    </a>
  );
}
