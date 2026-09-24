'use client';

import { useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';

const WORDS: Array<{ word: string; emoji: string }> = [
  { word: 'APPLE', emoji: '🍎' },
  { word: 'BANANA', emoji: '🍌' },
  { word: 'ELEPHANT', emoji: '🐘' },
  { word: 'UMBRELLA', emoji: '☂️' },
  { word: 'BUTTERFLY', emoji: '🦋' },
  { word: 'MOUNTAIN', emoji: '⛰️' },
  { word: 'BICYCLE', emoji: '🚲' },
  { word: 'RAINBOW', emoji: '🌈' },
  { word: 'GUITAR', emoji: '🎸' },
  { word: 'BALLOON', emoji: '🎈' },
  { word: 'CAMERA', emoji: '📷' },
  { word: 'ROCKET', emoji: '🚀' },
  { word: 'PENGUIN', emoji: '🐧' },
  { word: 'DOLPHIN', emoji: '🐬' },
  { word: 'CASTLE', emoji: '🏰' },
  { word: 'SANDWICH', emoji: '🥪' },
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function makeRound() {
  const target = WORDS[Math.floor(Math.random() * WORDS.length)]!;
  const wrongPool = shuffle(WORDS.filter((w) => w.word !== target.word)).slice(0, 3);
  const options = shuffle([target, ...wrongPool]);
  return { target, options };
}

/** Read the word, tap the matching picture — sight-word / reading recognition (the reverse
 * skill of SpellingPopGame, which goes picture -> spelling instead of word -> picture). */
export function SightWordMatchGame({ onCorrect }: { onCorrect?: () => void } = {}) {
  const [round, setRound] = useState(makeRound);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const pick = (word: string) => {
    if (feedback) return;
    if (word === round.target.word) {
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
      <p className="text-2xl font-black text-blue-700">Which picture matches this word?</p>
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 px-8 py-5 text-4xl font-black tracking-widest text-white shadow-xl">
        {round.target.word}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {round.options.map((option, index) => (
          <button
            key={`${option.word}-${index}`}
            type="button"
            onClick={() => pick(option.word)}
            className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-5xl shadow-lg transition active:scale-95 dark:bg-white/10"
          >
            {option.emoji}
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
