'use client';

import { useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';
import { notoNastaliqUrdu } from '@/lib/fonts/urdu';

const URDU_ALPHABET = [
  { letter: 'ا', name: 'Alif' },
  { letter: 'ب', name: 'Bay' },
  { letter: 'پ', name: 'Pay' },
  { letter: 'ت', name: 'Tay' },
  { letter: 'ٹ', name: 'Ttay' },
  { letter: 'ث', name: 'Say' },
  { letter: 'ج', name: 'Jeem' },
  { letter: 'چ', name: 'Cheem' },
  { letter: 'ح', name: 'Bari Hay' },
  { letter: 'خ', name: 'Khay' },
  { letter: 'د', name: 'Daal' },
  { letter: 'ذ', name: 'Zaal' },
  { letter: 'ر', name: 'Ray' },
  { letter: 'ڑ', name: 'Rray' },
  { letter: 'ز', name: 'Zay' },
  { letter: 'ژ', name: 'Zhay' },
  { letter: 'س', name: 'Seen' },
  { letter: 'ش', name: 'Sheen' },
  { letter: 'ص', name: 'Suaad' },
  { letter: 'ض', name: 'Zuaad' },
  { letter: 'ط', name: 'Toey' },
  { letter: 'ظ', name: 'Zoey' },
  { letter: 'ع', name: 'Ain' },
  { letter: 'غ', name: 'Ghain' },
  { letter: 'ف', name: 'Fay' },
  { letter: 'ق', name: 'Qaaf' },
  { letter: 'ک', name: 'Kaaf' },
  { letter: 'گ', name: 'Gaaf' },
  { letter: 'ل', name: 'Laam' },
  { letter: 'م', name: 'Meem' },
  { letter: 'ن', name: 'Noon' },
  { letter: 'و', name: 'Wao' },
  { letter: 'ہ', name: 'Choti Hay' },
  { letter: 'ھ', name: 'Do Chashmi Hay' },
  { letter: 'ی', name: 'Yay' },
  { letter: 'ے', name: 'Bari Yay' },
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
  const target = URDU_ALPHABET[Math.floor(Math.random() * URDU_ALPHABET.length)]!;
  const wrongPool = shuffle(URDU_ALPHABET.filter((letter) => letter.name !== target.name)).slice(0, 3);
  const options = shuffle([target, ...wrongPool]);
  return { target, options };
}

/** Match the big Urdu letter to its name — Urdu alphabet recognition for early learners. */
export function UrduAlphabetMatchGame({ onCorrect }: { onCorrect?: () => void } = {}) {
  const [round, setRound] = useState(makeRound);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const pick = (name: string) => {
    if (feedback) return;
    if (name === round.target.name) {
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
      <p className="text-center text-2xl font-black text-indigo-700">
        What is this letter&apos;s name? <span className="block text-lg">اس حرف کا نام کیا ہے؟</span>
      </p>
      <div
        className={`${notoNastaliqUrdu.className} flex h-32 w-32 items-center justify-center rounded-[2rem] bg-gradient-to-br from-indigo-500 to-blue-600 text-7xl font-black text-white shadow-xl`}
        dir="rtl"
        lang="ur"
      >
        {round.target.letter}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {round.options.map((option, index) => (
          <button
            key={`${option.name}-${index}`}
            type="button"
            onClick={() => pick(option.name)}
            className="h-20 w-24 rounded-3xl bg-gradient-to-br from-blue-400 to-indigo-600 text-lg font-black text-white shadow-lg transition active:scale-95"
          >
            {option.name}
          </button>
        ))}
      </div>
      {feedback === 'correct' && (
        <p className="flex items-center gap-2 text-xl font-bold text-emerald-600">
          <PartyPopper className="h-6 w-6" /> Yay! شاباش!
        </p>
      )}
      {feedback === 'wrong' && <p className="text-xl font-bold text-rose-500">Try again! / پھر کوشش کرو!</p>}
      <p className="flex items-center gap-2 text-lg font-bold text-amber-600">
        <Sparkles className="h-5 w-5" /> Stars: {score}
      </p>
    </div>
  );
}
