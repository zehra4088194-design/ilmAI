'use client';

import { Phone, PhoneOff } from 'lucide-react';

export function IncomingCallModal({
  name,
  avatarUrl,
  onAccept,
  onDecline,
}: {
  name: string;
  avatarUrl: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border-border w-full max-w-sm rounded-2xl border p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/20">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-emerald-500">{name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <p className="text-muted-foreground text-xs">Incoming voice call</p>
        <p className="mt-1 text-lg font-semibold">{name}</p>
        <div className="mt-6 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={onDecline}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600"
            aria-label="Decline call"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-600"
            aria-label="Accept call"
          >
            <Phone className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
