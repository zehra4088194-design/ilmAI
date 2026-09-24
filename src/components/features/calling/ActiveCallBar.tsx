'use client';

import { useEffect, useState } from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export function ActiveCallBar({
  name,
  avatarUrl,
  connected,
  isMuted,
  onToggleMute,
  onEndCall,
}: {
  name: string;
  avatarUrl: string | null;
  connected: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!connected) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [connected]);

  return (
    <div className="fixed bottom-5 left-1/2 z-[75] flex w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl border border-emerald-500/25 bg-card px-4 py-3 shadow-2xl sm:left-auto sm:right-5 sm:translate-x-0">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500/15">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-emerald-500">{name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="text-muted-foreground text-xs">{connected ? formatDuration(seconds) : 'Calling...'}</p>
      </div>
      <button
        type="button"
        onClick={onToggleMute}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${isMuted ? 'bg-amber-500/15 text-amber-500' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={onEndCall}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
        aria-label="End call"
      >
        <PhoneOff className="h-4 w-4" />
      </button>
    </div>
  );
}
