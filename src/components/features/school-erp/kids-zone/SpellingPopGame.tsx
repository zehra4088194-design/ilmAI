'use client';

import { useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';

const WORDS: Array<{ word: string; emoji: string }> = [
  { word: 'CAT', emoji: '🐱' },
  { word: 'DOG', emoji: '🐶' },
  { word: 'SUN', emoji: '☀️' },
  { word: 'HAT', emoji: '🎩' },
  { word: 'CUP', emoji: '☕' },
  { word: 'BUS', emoji: '🚌' },
  { word: 'PEN', emoji: '🖊️' },
  { word: 'BOX', emoji: '📦' },
  { word: 'FAN', emoji: '🪭' },
  { word: 'BEE', emoji: '🐝' },
  { word: 'FISH', emoji: '🐟' },
  { word: 'STAR', emoji: '⭐' },
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function scramble(word: string): string {
  const letters = shuffle(word.split(''));
  const scrambled = letters.join('');
  return scrambled === word ? scramble(word) : scrambled;
}

function makeRound() {
  const target = WORDS[Math.floor(Math.random() * WORDS.length)]!;
  const wrongPool = shuffle(WORDS.filter((w) => w.word !== target.word)).slice(0, 2);
  const options = shuffle([target.word, scramble(target.word), ...wrongPool.map((w) => w.word)]);
  return { target, options };
}

/** Pick the correctly spelled word for the pictured object — early reading/spelling recognition. */
export function SpellingPopGame() {
  const [round, setRound] = useState(makeRound);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const pick = (value: string) => {
    if (feedback) return;
    if (value === round.target.word) {
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
      <p className="text-2xl font-black text-fuchsia-700">Which spelling is right?</p>
      <div className="text-8xl">{round.target.emoji}</div>
      <div className="grid grid-cols-2 gap-4">
        {round.options.map((word, index) => (
          <button
            key={`${word}-${index}`}
            type="button"
            onClick={() => pick(word)}
            className="rounded-3xl bg-gradient-to-br from-fuchsia-400 to-pink-500 px-6 py-4 text-2xl font-black tracking-widest text-white shadow-lg transition active:scale-95"
          >
            {word}
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
