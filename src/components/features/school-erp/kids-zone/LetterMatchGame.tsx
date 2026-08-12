'use client';

import { useMemo, useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function makeRound() {
  const target = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]!;
  const wrongPool = shuffle(ALPHABET.filter((letter) => letter !== target)).slice(0, 3);
  const options = shuffle([target, ...wrongPool]);
  return { target, options };
}

/** Match the big capital letter to its lowercase twin — for pre-readers/early readers. */
export function LetterMatchGame() {
  const [round, setRound] = useState(makeRound);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const colors = useMemo(
    () => ['bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-sky-400', 'bg-violet-400', 'bg-fuchsia-400'],
    []
  );

  const pick = (letter: string) => {
    if (feedback) return;
    if (letter === round.target) {
      setFeedback('correct');
      setScore((s) => s + 1);
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
      <p className="text-2xl font-black text-violet-700">Find the small letter that matches!</p>
      <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-7xl font-black text-white shadow-xl">
        {round.target}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {round.options.map((letter, index) => (
          <button
            key={letter}
            type="button"
            onClick={() => pick(letter)}
            className={`h-20 w-20 rounded-3xl text-4xl font-black text-white shadow-lg transition active:scale-95 ${colors[index % colors.length]}`}
          >
            {letter.toLowerCase()}
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
