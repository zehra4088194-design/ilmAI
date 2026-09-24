'use client';

import { useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function makeRound() {
  const a = 1 + Math.floor(Math.random() * 20);
  let b = 1 + Math.floor(Math.random() * 20);
  while (b === a) b = 1 + Math.floor(Math.random() * 20); // never a tie
  const askBigger = Math.random() > 0.5;
  const answer = askBigger ? Math.max(a, b) : Math.min(a, b);
  return { options: shuffle([a, b]), askBigger, answer };
}

/** Tap whichever of two numbers is bigger (or smaller) — number-sense / comparison practice,
 * a different maths skill from CountAndTapGame (counting) and SimpleMathGame (arithmetic). */
export function NumberCompareGame({ onCorrect }: { onCorrect?: () => void } = {}) {
  const [round, setRound] = useState(makeRound);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const pick = (value: number) => {
    if (feedback) return;
    if (value === round.answer) {
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
      <p className="text-2xl font-black text-orange-700">
        Tap the {round.askBigger ? 'BIGGER' : 'SMALLER'} number!
      </p>
      <div className="flex gap-6">
        {round.options.map((value, index) => (
          <button
            key={`${value}-${index}`}
            type="button"
            onClick={() => pick(value)}
            className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-gradient-to-br from-orange-400 to-amber-500 text-5xl font-black text-white shadow-xl transition active:scale-95"
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
