'use client';

import { useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';

const EMOJIS = ['🍎', '⭐', '🐶', '🎈', '🚗', '🌸', '🐝', '🍪'];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function makeRound() {
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]!;
  const count = 1 + Math.floor(Math.random() * 9); // 1-9
  const wrongPool = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((n) => n !== count)).slice(0, 3);
  const options = shuffle([count, ...wrongPool]);
  return { emoji, count, options };
}

/** Count the objects, tap the matching number — number recognition + counting for early grades. */
export function CountAndTapGame({ onCorrect }: { onCorrect?: () => void } = {}) {
  const [round, setRound] = useState(makeRound);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const pick = (value: number) => {
    if (feedback) return;
    if (value === round.count) {
      setFeedback('correct');
      setScore((s) => s + 1);
      onCorrect?.();
      setTimeout(() => {
        setRound(makeRound());
        setFeedback(null);
      }, 700);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 500);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      <p className="text-2xl font-black text-sky-700">How many do you see?</p>
      <div className="flex max-w-md flex-wrap items-center justify-center gap-3 rounded-[2rem] bg-sky-50 p-6 text-5xl dark:bg-sky-950/30">
        {Array.from({ length: round.count }).map((_, index) => (
          <span key={index}>{round.emoji}</span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {round.options.map((value, index) => (
          <button
            key={`${value}-${index}`}
            type="button"
            onClick={() => pick(value)}
            className="h-20 w-20 rounded-3xl bg-gradient-to-br from-sky-400 to-cyan-500 text-4xl font-black text-white shadow-lg transition active:scale-95"
          >
            {value}
          </button>
        ))}
      </div>
      {feedback === 'correct' && (
        <p className="flex items-center gap-2 text-xl font-bold text-emerald-600">
          <PartyPopper className="h-6 w-6" /> Yay! Great job!
        </p>
      )}
      {feedback === 'wrong' && <p className="text-xl font-bold text-rose-500">Try again!</p>}
      <p className="flex items-center gap-2 text-lg font-bold text-amber-600">
        <Sparkles className="h-5 w-5" /> Stars: {score}
      </p>
    </div>
  );
}
