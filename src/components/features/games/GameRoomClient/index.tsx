'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Crown, Dice5, Gamepad2, Loader2, Send, Timer, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import type { GameCardData } from '@/lib/games/defaultGames';
import type { SubscriptionTier } from '@/types';

type GameEvent = {
  id: string;
  room_code: string;
  user_id: string | null;
  event_type: string;
  payload: { name?: string; value?: number; message?: string };
  created_at: string;
};

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function mmss(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

const LUDO_COLORS = [
  { name: 'Red', bg: 'bg-rose-500', soft: 'bg-rose-500/18', border: 'border-rose-400/70' },
  { name: 'Green', bg: 'bg-emerald-500', soft: 'bg-emerald-500/18', border: 'border-emerald-400/70' },
  { name: 'Blue', bg: 'bg-sky-500', soft: 'bg-sky-500/18', border: 'border-sky-400/70' },
  { name: 'Yellow', bg: 'bg-amber-400', soft: 'bg-amber-400/22', border: 'border-amber-300/80' },
];

function isPathCell(row: number, col: number) {
  if (row === 7 || col === 7) return true;
  if ((row >= 6 && row <= 8) || (col >= 6 && col <= 8)) return true;
  return false;
}

function ludoCellClass(row: number, col: number) {
  if (row < 6 && col < 6) return 'bg-rose-500/18 border-rose-400/50';
  if (row < 6 && col > 8) return 'bg-emerald-500/18 border-emerald-400/50';
  if (row > 8 && col < 6) return 'bg-sky-500/18 border-sky-400/50';
  if (row > 8 && col > 8) return 'bg-amber-400/20 border-amber-300/50';
  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return 'bg-gradient-to-br from-violet-500/80 via-cyan-500/80 to-emerald-500/80 border-white/40';
  if (isPathCell(row, col)) return 'bg-background/90 border-border';
  return 'bg-card/70 border-border/60';
}

function LudoBoard({ lastDice }: { lastDice?: number }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px] overflow-hidden rounded-[2rem] border border-border/80 bg-card p-3 shadow-2xl shadow-black/18">
      <div className="grid h-full w-full grid-cols-[repeat(15,minmax(0,1fr))] grid-rows-[repeat(15,minmax(0,1fr))] gap-0.5 rounded-3xl bg-border/55 p-1">
        {Array.from({ length: 225 }).map((_, index) => {
          const row = Math.floor(index / 15);
          const col = index % 15;
          return <span key={index} className={`rounded-[4px] border ${ludoCellClass(row, col)}`} />;
        })}
      </div>

      <div className="pointer-events-none absolute inset-5 grid grid-cols-2 grid-rows-2 gap-[22%]">
        {LUDO_COLORS.map((color) => (
          <div key={color.name} className={`rounded-[1.6rem] border ${color.border} ${color.soft} p-[16%] shadow-inner`}>
            <div className="grid h-full grid-cols-2 gap-[16%] rounded-[1.1rem] bg-background/82 p-[14%]">
              {[1, 2, 3, 4].map((token) => (
                <span key={token} className={`rounded-full ${color.bg} shadow-lg ring-4 ring-background/80`} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute left-1/2 top-1/2 flex h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border border-white/35 bg-background/92 text-center shadow-xl backdrop-blur">
        <Dice5 className="h-6 w-6 text-violet-500" />
        <span className="mt-1 text-2xl font-black">{lastDice || '-'}</span>
      </div>
    </div>
  );
}

export function GameRoomClient({
  game,
  tier,
  canPlay,
  initialRemainingSeconds,
}: {
  game: GameCardData;
  tier: SubscriptionTier;
  canPlay: boolean;
  initialRemainingSeconds: number;
}) {
  const [roomCode, setRoomCode] = useState('');
  const [joinedRoom, setJoinedRoom] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(initialRemainingSeconds);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [message, setMessage] = useState('');
  const [joining, setJoining] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!sessionId) return;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        const next = Math.max(0, current - 1);
        if (next === 300) toast.info('5 minutes left. Relax your mind, phir study par wapas.');
        if (next === 0) toast.warning('Game time complete. Ab study mode mein wapas jao.');
        return next;
      });
      fetch('/api/games/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }, 1000);
    return () => {
      window.clearInterval(timer);
      fetch('/api/games/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, end: true }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [sessionId]);

  useEffect(() => {
    if (!joinedRoom) return;
    fetch(`/api/games/events?roomCode=${joinedRoom}`)
      .then((res) => res.json())
      .then((json) => setEvents(json.events || []))
      .catch(() => {});

    const channel = supabase
      .channel(`game_room:${joinedRoom}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_room_events', filter: `room_code=eq.${joinedRoom}` }, (payload) => {
        setEvents((items) => [...items, payload.new as GameEvent]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [joinedRoom, supabase]);

  const joinRoom = async (nextRoom = roomCode || makeRoomCode()) => {
    if (!canPlay) return;
    const code = nextRoom.trim().toUpperCase().slice(0, 16);
    setJoining(true);
    try {
      const res = await fetch('/api/games/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id.length > 20 ? game.id : null, roomCode: code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Room join nahi hua');
      setSessionId(json.session.id);
      setJoinedRoom(code);
      setRoomCode(code);
      setRemaining(Math.min(remaining, Number(json.remainingSeconds || remaining)));
      await sendEvent('join', { message: 'joined the room' }, code);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Room join nahi hua');
    } finally {
      setJoining(false);
    }
  };

  const sendEvent = async (eventType: string, payload: Record<string, unknown>, targetRoom = joinedRoom) => {
    if (!targetRoom) return;
    const res = await fetch('/api/games/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: targetRoom, gameId: game.id.length > 20 ? game.id : null, eventType, payload }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Event send nahi hua');
  };

  const rollDice = async () => {
    if (!joinedRoom || remaining <= 0) return;
    await sendEvent('dice_roll', { value: Math.floor(Math.random() * 6) + 1 });
  };

  const sendChat = async () => {
    if (!message.trim() || !joinedRoom || remaining <= 0) return;
    await sendEvent('message', { message: message.trim().slice(0, 180) });
    setMessage('');
  };

  const lastDice = [...events].reverse().find((event) => event.event_type === 'dice_roll')?.payload?.value;
  const playerNames = Array.from(new Set(events.filter((event) => event.event_type === 'join').map((event) => event.payload?.name || event.user_id || 'Player'))).slice(0, 4);

  if (!canPlay) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Button asChild variant="ghost"><Link href="/games"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
        <Card className="border-violet-500/30 bg-violet-500/10">
          <CardContent className="p-6 text-center">
            <Crown className="mx-auto mb-3 h-10 w-10 text-violet-400" />
            <h1 className="text-xl font-bold">Live games Pro/Elite feature hain</h1>
            <p className="mt-2 text-sm text-muted-foreground">Games ka purpose rest hai: relax your mind, phir study pe wapas.</p>
            <Button asChild variant="gradient" className="mt-4"><Link href="/subscription">Upgrade Pro</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost"><Link href="/games"><ArrowLeft className="h-4 w-4" /> Games</Link></Button>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-2"><Crown className="h-3.5 w-3.5" /> {tier}</Badge>
          <Badge variant={remaining > 300 ? 'secondary' : 'warning'} className="gap-2"><Timer className="h-4 w-4" /> {mmss(remaining)} left today</Badge>
        </div>
      </div>

      <Card className="dashboard-surface">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{game.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Relax your mind. Study se break lo, lekin daily limit ke baad wapas focus mode.</p>
          </div>
          {!joinedRoom && (
            <div className="flex w-full gap-2 md:w-auto">
              <Input placeholder="Room code optional" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} />
              <Button variant="gradient" onClick={() => joinRoom()} loading={joining}>{joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gamepad2 className="h-4 w-4" />} Join</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {joinedRoom ? (
        <div className="grid gap-5 lg:grid-cols-[1fr,360px]">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Live Room {joinedRoom}</span>
                <Button onClick={rollDice} disabled={remaining <= 0} variant="gradient"><Dice5 className="h-4 w-4" /> Roll Dice</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <LudoBoard lastDice={lastDice} />
              <div className="grid gap-3 sm:grid-cols-4">
                {LUDO_COLORS.map((color, index) => (
                  <div key={color.name} className={`rounded-2xl border ${color.border} ${color.soft} p-3`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${color.bg}`} />
                      <p className="text-sm font-semibold">{playerNames[index] || `${color.name} seat`}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{playerNames[index] ? 'Online in room' : 'Waiting for player'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4 text-violet-500" /> Room Activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="h-80 space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-muted/25 p-3">
                {events.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
                {events.map((event) => (
                  <div key={event.id} className="rounded-lg bg-card p-2 text-sm">
                    <p className="font-medium">{event.event_type === 'dice_roll' ? `Dice: ${event.payload?.value}` : event.payload?.message || event.event_type}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(event.created_at).toLocaleTimeString()}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Study-safe room message" onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }} />
                <Button size="icon" onClick={sendChat}><Send className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Room create ya join karo. Friend ko same room code do.</CardContent></Card>
      )}
    </div>
  );
}
