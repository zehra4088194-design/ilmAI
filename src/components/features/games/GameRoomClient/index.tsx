'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Brain, CheckCircle2, Copy, Crown, Dice5, Gamepad2, Loader2, RotateCcw, Send, Timer, Trophy, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import type { GameCardData } from '@/lib/games/defaultGames';
import type { SubscriptionTier } from '@/types';

type LudoToken = { position: number };

type LudoPlayer = {
  id: string;
  name: string;
  color: (typeof LUDO_COLORS)[number]['key'];
  tokens: LudoToken[];
};

type LudoState = {
  players: LudoPlayer[];
  currentPlayer: number;
  dice: number | null;
  winnerIds: string[];
};

type GameEvent = {
  id: string;
  room_code: string;
  user_id: string | null;
  event_type: string;
  payload: { name?: string; value?: number; message?: string; tokenIndex?: number };
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
  { key: 'red', name: 'Red', bg: 'bg-rose-500', soft: 'bg-rose-500/18', border: 'border-rose-400/70', hex: '#f43f5e', start: 0 },
  { key: 'green', name: 'Green', bg: 'bg-emerald-500', soft: 'bg-emerald-500/18', border: 'border-emerald-400/70', hex: '#10b981', start: 13 },
  { key: 'yellow', name: 'Yellow', bg: 'bg-amber-400', soft: 'bg-amber-400/22', border: 'border-amber-300/80', hex: '#fbbf24', start: 26 },
  { key: 'blue', name: 'Blue', bg: 'bg-sky-500', soft: 'bg-sky-500/18', border: 'border-sky-400/70', hex: '#0ea5e9', start: 39 },
] as const;

const LUDO_PATH: Array<[number, number]> = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0],
];

const HOME_PATHS: Record<LudoPlayer['color'], Array<[number, number]>> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

function emptyLudoState(): LudoState {
  return { players: [], currentPlayer: 0, dice: null, winnerIds: [] };
}

const DIE_DOTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DiceFace({ value, rolling = false, compact = false }: { value: number; rolling?: boolean; compact?: boolean }) {
  return (
    <div
      className={`${compact ? 'h-12 w-12 rounded-xl p-2' : 'h-20 w-20 rounded-2xl p-3'} grid grid-cols-3 grid-rows-3 border-2 border-white/70 bg-gradient-to-br from-white to-slate-200 shadow-[0_12px_30px_rgba(0,0,0,0.45)] ${rolling ? 'animate-[spin_0.18s_linear_infinite]' : ''}`}
      aria-label={`Dice showing ${value}`}
    >
      {Array.from({ length: 9 }, (_, index) => (
        <span
          key={index}
          className={`${DIE_DOTS[value]?.includes(index) ? 'scale-100 bg-slate-900' : 'scale-0 bg-transparent'} m-auto h-2.5 w-2.5 rounded-full transition-transform ${compact ? 'h-1.5 w-1.5' : ''}`}
        />
      ))}
    </div>
  );
}

function canMoveToken(token: LudoToken, dice: number) {
  return token.position === -1 ? dice === 6 : token.position + dice <= 56;
}

function nextPlayer(state: LudoState) {
  const eligible = state.players.map((player) => player.id).filter((id) => !state.winnerIds.includes(id));
  if (eligible.length < 2) return 0;
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const index = (state.currentPlayer + offset) % state.players.length;
    if (!state.winnerIds.includes(state.players[index]!.id)) return index;
  }
  return 0;
}

function ludoStateFromEvents(events: GameEvent[]): LudoState {
  const state = emptyLudoState();
  const joinedIds = new Set<string>();

  for (const event of events) {
    if (event.event_type === 'join' && event.user_id && !joinedIds.has(event.user_id) && state.players.length < 4) {
      const color = LUDO_COLORS[state.players.length]!.key;
      joinedIds.add(event.user_id);
      state.players.push({ id: event.user_id, name: event.payload.name || `Player ${state.players.length + 1}`, color, tokens: Array.from({ length: 4 }, () => ({ position: -1 })) });
      continue;
    }
    if (event.event_type !== 'ludo_roll' && event.event_type !== 'ludo_move') continue;
    const active = state.players[state.currentPlayer];
    if (!active || active.id !== event.user_id || state.winnerIds.includes(active.id)) continue;

    if (event.event_type === 'ludo_roll' && state.dice === null) {
      const value = Number(event.payload.value);
      if (!Number.isInteger(value) || value < 1 || value > 6) continue;
      state.dice = value;
      if (!active.tokens.some((token) => canMoveToken(token, value))) {
        state.dice = null;
        state.currentPlayer = nextPlayer(state);
      }
      continue;
    }

    if (event.event_type === 'ludo_move' && state.dice !== null) {
      const tokenIndex = Number(event.payload.tokenIndex);
      const token = active.tokens[tokenIndex];
      if (!Number.isInteger(tokenIndex) || !token || !canMoveToken(token, state.dice)) continue;
      token.position = token.position === -1 ? 0 : token.position + state.dice;

      if (token.position >= 0 && token.position < 52 && !SAFE_SQUARES.has((LUDO_COLORS.find((color) => color.key === active.color)!.start + token.position) % 52)) {
        const globalPosition = (LUDO_COLORS.find((color) => color.key === active.color)!.start + token.position) % 52;
        state.players.forEach((opponent) => {
          if (opponent.id === active.id) return;
          const opponentStart = LUDO_COLORS.find((color) => color.key === opponent.color)!.start;
          opponent.tokens.forEach((opponentToken) => {
            if (opponentToken.position >= 0 && opponentToken.position < 52 && (opponentStart + opponentToken.position) % 52 === globalPosition) opponentToken.position = -1;
          });
        });
      }

      if (active.tokens.every((item) => item.position === 56) && !state.winnerIds.includes(active.id)) state.winnerIds.push(active.id);
      const rolledSix = state.dice === 6;
      state.dice = null;
      if (!rolledSix || state.winnerIds.includes(active.id)) state.currentPlayer = nextPlayer(state);
    }
  }
  return state;
}

const MEMORY_PAIRS = [
  { id: 'formula', label: 'Formula', tone: 'border-sky-400/50 bg-sky-500/12 text-sky-200' },
  { id: 'concept', label: 'Concept', tone: 'border-emerald-400/50 bg-emerald-500/12 text-emerald-200' },
  { id: 'definition', label: 'Definition', tone: 'border-amber-400/50 bg-amber-500/12 text-amber-200' },
  { id: 'diagram', label: 'Diagram', tone: 'border-rose-400/50 bg-rose-500/12 text-rose-200' },
  { id: 'example', label: 'Example', tone: 'border-violet-400/50 bg-violet-500/12 text-violet-200' },
  { id: 'review', label: 'Review', tone: 'border-cyan-400/50 bg-cyan-500/12 text-cyan-200' },
];

function createMemoryDeck() {
  return MEMORY_PAIRS.flatMap((item) => [
    { ...item, cardId: `${item.id}-a` },
    { ...item, cardId: `${item.id}-b` },
  ]).sort(() => Math.random() - 0.5);
}

function pathIndexAt(row: number, col: number) {
  return LUDO_PATH.findIndex(([pathRow, pathCol]) => pathRow === row && pathCol === col);
}

function ludoCellClass(row: number, col: number) {
  if (row === 7 && col === 7) return 'border-white/60 bg-white';
  if (row < 6 && col < 6) return row >= 1 && row <= 4 && col >= 1 && col <= 4 ? 'border-rose-200 bg-white' : 'border-rose-300 bg-rose-400/85';
  if (row < 6 && col > 8) return row >= 1 && row <= 4 && col >= 10 && col <= 13 ? 'border-emerald-200 bg-white' : 'border-emerald-300 bg-emerald-400/85';
  if (row > 8 && col > 8) return row >= 10 && row <= 13 && col >= 10 && col <= 13 ? 'border-amber-200 bg-white' : 'border-amber-300 bg-amber-300/90';
  if (row > 8 && col < 6) return row >= 10 && row <= 13 && col >= 1 && col <= 4 ? 'border-sky-200 bg-white' : 'border-sky-300 bg-sky-400/85';

  if (row === 7 && col >= 1 && col <= 6) return 'border-rose-300 bg-rose-300/85';
  if (col === 7 && row >= 1 && row <= 6) return 'border-emerald-300 bg-emerald-300/85';
  if (row === 7 && col >= 8 && col <= 13) return 'border-amber-300 bg-amber-300/85';
  if (col === 7 && row >= 8 && row <= 13) return 'border-sky-300 bg-sky-300/85';

  const pathIndex = pathIndexAt(row, col);
  if (pathIndex !== -1) {
    if (pathIndex === 0) return 'border-rose-500 bg-rose-500';
    if (pathIndex === 13) return 'border-emerald-500 bg-emerald-500';
    if (pathIndex === 26) return 'border-amber-400 bg-amber-400';
    if (pathIndex === 39) return 'border-sky-500 bg-sky-500';
    return 'border-slate-200 bg-white';
  }
  return 'border-transparent bg-transparent';
}

function LudoBoard({ state, currentUserId, onMove }: { state: LudoState; currentUserId: string | null; onMove: (tokenIndex: number) => void }) {
  const activePlayer = state.players[state.currentPlayer];
  const movable = activePlayer && state.dice ? activePlayer.tokens.map((token) => canMoveToken(token, state.dice!)) : [];
  const basePositions: Record<LudoPlayer['color'], Array<[number, number]>> = {
    red: [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]],
    green: [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]],
    yellow: [[10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]],
    blue: [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]],
  };

  const baseStyles: Record<LudoPlayer['color'], React.CSSProperties> = {
    red: { top: '6.67%', left: '6.67%' },
    green: { top: '6.67%', right: '6.67%' },
    yellow: { bottom: '6.67%', right: '6.67%' },
    blue: { bottom: '6.67%', left: '6.67%' },
  };

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[660px] overflow-hidden rounded-xl border-4 border-slate-800 bg-slate-800 p-1 shadow-2xl">
      <div className="grid h-full w-full grid-cols-[repeat(15,minmax(0,1fr))] grid-rows-[repeat(15,minmax(0,1fr))] gap-px bg-slate-200">
        {Array.from({ length: 225 }).map((_, index) => {
          const row = Math.floor(index / 15);
          const col = index % 15;
          const pathIndex = pathIndexAt(row, col);
          return (
            <span key={index} className={`relative flex items-center justify-center border ${ludoCellClass(row, col)}`}>
              {SAFE_SQUARES.has(pathIndex) && pathIndex !== 0 && pathIndex !== 13 && pathIndex !== 26 && pathIndex !== 39 && (
                <span className="text-[clamp(7px,1.2vw,12px)] leading-none text-slate-400">*</span>
              )}
            </span>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-0">
        {LUDO_COLORS.map((color) => (
          <div
            key={color.key}
            style={baseStyles[color.key]}
            className="absolute grid h-[26.67%] w-[26.67%] grid-cols-2 gap-[16%] rounded-[18%] border-[3px] border-white/80 bg-white/95 p-[14%] shadow-inner"
          >
            {[0, 1, 2, 3].map((token) => <span key={token} className="rounded-full border-[3px] border-white shadow-inner" style={{ backgroundColor: `${color.hex}55`, boxShadow: `inset 0 0 0 2px ${color.hex}` }} />)}
          </div>
        ))}
        <div className="absolute left-1/2 top-1/2 h-[19.5%] w-[19.5%] -translate-x-1/2 -translate-y-1/2 border-2 border-white/80" style={{ background: 'conic-gradient(from 45deg, #10b981 0 25%, #fbbf24 0 50%, #0ea5e9 0 75%, #f43f5e 0)' }} />
      </div>
      {state.players.flatMap((player) => player.tokens.map((token, tokenIndex) => {
        const color = LUDO_COLORS.find((item) => item.key === player.color)!;
        const start = color.start;
        const point = token.position === -1
          ? basePositions[player.color][tokenIndex]!
          : token.position < 52
            ? LUDO_PATH[(start + token.position) % 52]!
            : HOME_PATHS[player.color][token.position - 52]!;
        const playable = player.id === currentUserId && activePlayer?.id === player.id && Boolean(movable[tokenIndex]);
        return (
          <button
            key={`${player.id}-${tokenIndex}`}
            type="button"
            aria-label={`${player.name} token ${tokenIndex + 1}`}
            onClick={() => playable && onMove(tokenIndex)}
            disabled={!playable}
            className={`absolute z-20 flex h-[5.8%] w-[5.8%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[9px] font-black text-white shadow-lg transition-transform ${playable ? 'cursor-pointer animate-pulse ring-4 ring-slate-900/25 hover:scale-110' : 'cursor-default'}`}
            style={{ left: `${((point[1] + 0.5) / 15) * 100}%`, top: `${((point[0] + 0.5) / 15) * 100}%`, background: `radial-gradient(circle at 30% 25%, #ffffffaa, ${color.hex} 45%, #111827 160%)` }}
          >
            {tokenIndex + 1}
          </button>
        );
      }))}
    </div>
  );
}

function MemoryMatchGame() {
  const [deck, setDeck] = useState(createMemoryDeck);
  const [selected, setSelected] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (selected.length !== 2) return;
    const [first, second] = selected;
    if (first === undefined || second === undefined) return;
    const firstCard = deck[first];
    const secondCard = deck[second];
    if (!firstCard || !secondCard) return;
    const timeout = window.setTimeout(() => {
      if (firstCard?.id === secondCard?.id) {
        setMatched((current) => new Set([...current, firstCard.id]));
      }
      setSelected([]);
    }, 550);
    return () => window.clearTimeout(timeout);
  }, [deck, selected]);

  const reset = () => {
    setDeck(createMemoryDeck());
    setSelected([]);
    setMatched(new Set());
    setMoves(0);
  };

  const chooseCard = (index: number) => {
    if (selected.length === 2 || selected.includes(index) || matched.has(deck[index]!.id)) return;
    setSelected((current) => [...current, index]);
    if (selected.length === 1) setMoves((value) => value + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/25 p-3">
        <div>
          <p className="text-sm font-semibold">Memory Matrix</p>
          <p className="text-xs text-muted-foreground">Match all concept pairs with the fewest moves.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{matched.size}/{MEMORY_PAIRS.length} pairs</Badge>
          <Badge variant="outline">{moves} moves</Badge>
          <Button size="icon" variant="outline" onClick={reset} aria-label="Restart memory game">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {deck.map((card, index) => {
          const visible = selected.includes(index) || matched.has(card.id);
          return (
            <button
              key={card.cardId}
              type="button"
              onClick={() => chooseCard(index)}
              className={`aspect-[1.15] rounded-xl border p-2 text-center transition-all ${
                visible
                  ? `${card.tone} shadow-sm`
                  : 'border-border/70 bg-card hover:border-violet-400/45 hover:bg-violet-500/10'
              }`}
            >
              <span className="flex h-full items-center justify-center text-xs font-bold sm:text-sm">
                {visible ? card.label : '?'}
              </span>
            </button>
          );
        })}
      </div>
      {matched.size === MEMORY_PAIRS.length && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <Trophy className="h-4 w-4" />
          Completed in {moves} moves. Take a short break, then return to study.
        </div>
      )}
    </div>
  );
}

function buildLogicRound() {
  const left = Math.floor(Math.random() * 6) + 1;
  const right = Math.floor(Math.random() * 6) + 1;
  const operation = Math.random() > 0.5 ? 'multiply-add' : 'double-difference';
  const answer = operation === 'multiply-add' ? left * right + left : left * 2 + Math.abs(left - right);
  const options = Array.from(new Set([answer, answer + 2, Math.max(1, answer - 1), answer + 5]))
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);
  return { left, right, operation, answer, options };
}

function LogicDiceGame({ onRoll }: { onRoll: () => Promise<void> }) {
  const [round, setRound] = useState(buildLogicRound);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<number | null>(null);

  const prompt =
    round.operation === 'multiply-add'
      ? `(${round.left} x ${round.right}) + ${round.left}`
      : `(${round.left} x 2) + |${round.left} - ${round.right}|`;

  const chooseAnswer = (value: number) => {
    if (answered !== null) return;
    setAnswered(value);
    if (value === round.answer) setScore((current) => current + 1);
  };

  const next = async () => {
    await onRoll();
    setRound(buildLogicRound());
    setAnswered(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[220px,1fr]">
        <div className="rounded-2xl border border-border/70 bg-muted/25 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dice</p>
          <div className="mt-4 flex justify-center gap-3">
            {[round.left, round.right].map((value, index) => (
              <div key={index} className="flex h-20 w-20 items-center justify-center rounded-2xl border border-violet-400/35 bg-violet-500/12 text-4xl font-black">
                {value}
              </div>
            ))}
          </div>
          <Badge className="mt-4" variant="secondary">Score {score}</Badge>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
            <Brain className="h-4 w-4" />
            Logic challenge
          </div>
          <p className="mt-3 text-2xl font-bold">{prompt}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {round.options.map((value) => {
              const isCorrect = answered !== null && value === round.answer;
              const isWrong = answered === value && value !== round.answer;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => chooseAnswer(value)}
                  className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${
                    isCorrect
                      ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                      : isWrong
                        ? 'border-rose-400/60 bg-rose-500/15 text-rose-200'
                        : 'border-border/70 bg-muted/25 hover:border-violet-400/45 hover:bg-violet-500/10'
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
          <Button onClick={next} variant="gradient" className="mt-4 w-full">
            <Dice5 className="h-4 w-4" />
            Next round
          </Button>
        </div>
      </div>
      {answered === round.answer && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          Correct. Keep the pace steady.
        </div>
      )}
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
  const [isRolling, setIsRolling] = useState(false);
  const [rollingFace, setRollingFace] = useState(1);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState('Student');
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setCurrentUserId(user.id);
      setCurrentUserName(String(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student').slice(0, 20));
    });
  }, [supabase]);

  useEffect(() => {
    if (!sessionId) return;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        const next = Math.max(0, current - 1);
        if (next === 300) toast.info('5 minutes left. Relax your mind, then return to study.');
        if (next === 0) toast.warning('Game time is complete. Return to study mode.');
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
    const syncEvents = () => {
      fetch(`/api/games/events?roomCode=${joinedRoom}`)
        .then((res) => res.json())
        .then((json) => setEvents(json.events || []))
        .catch(() => {});
    };
    syncEvents();
    const polling = window.setInterval(syncEvents, 2500);

    const channel = supabase
      .channel(`game_room:${joinedRoom}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_room_events', filter: `room_code=eq.${joinedRoom}` }, (payload) => {
        const event = payload.new as GameEvent;
        setEvents((items) => (items.some((item) => item.id === event.id) ? items : [...items, event]));
      })
      .subscribe();

    return () => {
      window.clearInterval(polling);
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
      if (!res.ok) throw new Error(json.error || 'Could not join the room');
      setSessionId(json.session.id);
      setJoinedRoom(code);
      setRoomCode(code);
      setRemaining(Math.min(remaining, Number(json.remainingSeconds || remaining)));
      await sendEvent('join', { name: currentUserName, message: 'joined the room' }, code);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not join the room');
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
    if (!res.ok) throw new Error(json.error || 'Could not send game event');
  };

  const rollDice = async () => {
    if (!joinedRoom || remaining <= 0 || isRolling) return;
    setIsRolling(true);
    const animation = window.setInterval(() => setRollingFace(Math.floor(Math.random() * 6) + 1), 70);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 560));
      const value = Math.floor(Math.random() * 6) + 1;
      setRollingFace(value);
      await sendEvent(game.game_type === 'live_ludo' ? 'ludo_roll' : 'dice_roll', { value });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The dice could not be rolled.');
    } finally {
      window.clearInterval(animation);
      setIsRolling(false);
    }
  };

  const moveLudoToken = async (tokenIndex: number) => {
    if (!joinedRoom || remaining <= 0) return;
    await sendEvent('ludo_move', { tokenIndex });
  };

  const sendChat = async () => {
    if (!message.trim() || !joinedRoom || remaining <= 0) return;
    await sendEvent('message', { message: message.trim().slice(0, 180) });
    setMessage('');
  };

  const copyRoomCode = async () => {
    if (!joinedRoom) return;
    try {
      await navigator.clipboard.writeText(joinedRoom);
      toast.success('Room code copied.');
    } catch {
      toast.error('Room code could not be copied.');
    }
  };

  const lastDice = [...events].reverse().find((event) => event.event_type === 'dice_roll')?.payload?.value;
  const lastLudoDice = [...events].reverse().find((event) => event.event_type === 'ludo_roll')?.payload?.value;
  const ludoState = useMemo(() => ludoStateFromEvents(events), [events]);
  const activeLudoPlayer = ludoState.players[ludoState.currentPlayer];
  const isMyLudoTurn = game.game_type === 'live_ludo' && activeLudoPlayer?.id === currentUserId && ludoState.dice === null;

  if (!canPlay) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Button asChild variant="ghost"><Link href="/games"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
        <Card className="border-violet-500/30 bg-violet-500/10">
          <CardContent className="p-6 text-center">
            <Crown className="mx-auto mb-3 h-10 w-10 text-violet-400" />
            <h1 className="text-xl font-bold">Live games are a Pro/Elite feature</h1>
            <p className="mt-2 text-sm text-muted-foreground">Games are designed as short cognitive breaks before returning to study.</p>
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
            <p className="mt-1 text-sm text-muted-foreground">Take a short mental reset, then return to focused study when the daily limit ends.</p>
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
          <Card className={game.game_type === 'live_ludo' ? 'overflow-hidden border-slate-700 bg-[#111729] text-slate-100 shadow-2xl' : 'overflow-hidden'}>
            <CardHeader className={game.game_type === 'live_ludo' ? 'border-b border-slate-700/80 bg-[#171f34] pb-4' : undefined}>
              <CardTitle className="flex items-center justify-between">
                <span className="flex min-w-0 items-center gap-2">
                  {game.game_type === 'live_ludo' ? 'Ludo Arena' : `Live Room ${joinedRoom}`}
                  {game.game_type === 'live_ludo' && (
                    <button type="button" onClick={() => void copyRoomCode()} className="rounded-md border border-slate-600 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700" aria-label="Copy room code" title="Copy room code">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
                {game.game_type !== 'memory_match' && (
                  <Button onClick={rollDice} disabled={isRolling || remaining <= 0 || (game.game_type === 'live_ludo' && !isMyLudoTurn)} variant="gradient" className={game.game_type === 'live_ludo' ? 'min-w-28 shadow-lg shadow-violet-900/40' : undefined}><Dice5 className={`h-4 w-4 ${isRolling ? 'animate-spin' : ''}`} /> {isRolling ? 'Rolling...' : 'Roll'}</Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className={game.game_type === 'live_ludo' ? 'space-y-4 p-3 sm:p-5' : 'space-y-4'}>
              {game.game_type === 'memory_match' ? (
                <MemoryMatchGame />
              ) : game.game_type === 'logic_dice' ? (
                <LogicDiceGame onRoll={rollDice} />
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-700 bg-[#0a1020] p-2 shadow-inner sm:p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                      <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 font-mono font-semibold tracking-[0.16em] text-slate-200">ROOM {joinedRoom}</span>
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 font-semibold text-emerald-300">{ludoState.players.length}/4 playing</span>
                    </div>
                    <div className="mb-4 flex flex-col items-center justify-center rounded-2xl border border-violet-400/25 bg-gradient-to-b from-violet-500/15 to-slate-950/20 p-4">
                      <DiceFace
                        value={isRolling ? rollingFace : Number(ludoState.dice || lastLudoDice || 1)}
                        rolling={isRolling}
                      />
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
                        {isRolling
                          ? 'Rolling'
                          : ludoState.dice
                            ? `${activeLudoPlayer?.name || 'Player'} rolled ${ludoState.dice}`
                            : lastLudoDice
                              ? `Last roll: ${lastLudoDice}`
                              : 'Roll the dice'}
                      </p>
                    </div>
                    <LudoBoard state={ludoState} currentUserId={currentUserId} onMove={moveLudoToken} />
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-slate-200">
                    <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    {ludoState.players.length < 2
                      ? 'Share the room code to invite another student.'
                      : ludoState.winnerIds.length > 0
                        ? `${ludoState.players.find((player) => player.id === ludoState.winnerIds[0])?.name || 'A player'} has finished the match.`
                        : ludoState.dice
                          ? `${activeLudoPlayer?.name || 'Player'} rolled ${ludoState.dice}. Choose a glowing token.`
                          : `${activeLudoPlayer?.name || 'Waiting for players'} is rolling now.`}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {LUDO_COLORS.map((color, index) => (
                      <div key={color.name} className={`rounded-xl border p-2.5 transition ${ludoState.players[index]?.id === activeLudoPlayer?.id ? `${color.border} ${color.soft} ring-1 ring-white/30` : 'border-slate-700 bg-slate-800/60'}`}>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color.bg} text-xs font-black text-white ring-2 ring-white/30`}>
                            {ludoState.players[index]?.name?.slice(0, 1).toUpperCase() || '+'}
                          </span>
                          <p className="truncate text-sm font-semibold text-white">{ludoState.players[index]?.name || `${color.name} seat`}</p>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-400">{ludoState.players[index] ? (ludoState.winnerIds.includes(ludoState.players[index]!.id) ? 'Finished' : ludoState.players[index]?.id === activeLudoPlayer?.id ? 'Playing now' : 'In room') : 'Open seat'}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
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
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Create or join a room. Share the same room code with a friend.</CardContent></Card>
      )}
    </div>
  );
}
