'use client';

import { useMemo, useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';

const THEMES: Record<string, string[]> = {
  animals: ['🐶', '🐱', '🐰', '🦁', '🐸', '🐼'],
  fruits: ['🍎', '🍌', '🍇', '🍓', '🍉', '🍍'],
  shapes: ['⭐', '❤️', '⚪', '🔺', '🟦', '🔶'],
  space: ['🚀', '🌙', '✨', '☄️', '🪐', '🛸'],
  ocean: ['🐟', '🐠', '🐬', '🐳', '🦀', '🐙'],
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function makeBoard(theme: string) {
  const emojis = THEMES[theme] || THEMES.animals!;
  const pairs = shuffle([...emojis, ...emojis]).map((emoji, index) => ({
    id: index,
    emoji,
    flipped: false,
    matched: false,
  }));
  return pairs;
}

/** Classic flip-two-cards memory match — themed emoji pairs, no DB content needed. */
export function MemoryMatchGame({ theme = 'animals', onCorrect }: { theme?: string; onCorrect?: () => void }) {
  const [board, setBoard] = useState(() => makeBoard(theme));
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [moves, setMoves] = useState(0);
  const allMatched = useMemo(() => board.every((card) => card.matched), [board]);

  const reset = () => {
    setBoard(makeBoard(theme));
    setSelected([]);
    setMoves(0);
  };

  const flip = (id: number) => {
    if (busy || allMatched) return;
    const card = board.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;
    const nextSelected = [...selected, id];
    setBoard((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)));

    if (nextSelected.length === 2) {
      setBusy(true);
      setMoves((m) => m + 1);
      const [firstId, secondId] = nextSelected;
      const first = board.find((c) => c.id === firstId);
      const second = card;
      setTimeout(() => {
        setBoard((prev) =>
          prev.map((c) => {
            if (c.id === firstId || c.id === secondId) {
              const isMatch = first?.emoji === second?.emoji;
              return { ...c, matched: isMatch, flipped: isMatch };
            }
            return c;
          })
        );
        if (first?.emoji === second?.emoji) onCorrect?.();
        setSelected([]);
        setBusy(false);
      }, 700);
    } else {
      setSelected(nextSelected);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="grid grid-cols-4 gap-3">
        {board.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => flip(card.id)}
            disabled={card.matched}
            className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-lg transition active:scale-95 sm:h-20 sm:w-20 ${
              card.flipped || card.matched
                ? 'bg-white dark:bg-white/10'
                : 'bg-gradient-to-br from-fuchsia-400 to-purple-600'
            }`}
          >
            {card.flipped || card.matched ? card.emoji : ''}
          </button>
        ))}
      </div>

      {allMatched ? (
        <div className="flex flex-col items-center gap-2">
          <p className="flex items-center gap-2 text-xl font-bold text-emerald-600">
            <PartyPopper className="h-6 w-6" /> All matched in {moves} moves!
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-violet-600 px-5 py-2 text-sm font-bold text-white shadow-md"
          >
            Play again
          </button>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-lg font-bold text-amber-600">
          <Sparkles className="h-5 w-5" /> Moves: {moves}
        </p>
      )}
    </div>
  );
}
