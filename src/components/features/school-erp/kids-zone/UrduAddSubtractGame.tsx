'use client';

import { useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';
import { notoNastaliqUrdu } from '@/lib/fonts/urdu';

const URDU_NUMBERS: Record<number, string> = {
  0: 'صفر',
  1: 'ایک',
  2: 'دو',
  3: 'تین',
  4: 'چار',
  5: 'پانچ',
  6: 'چھ',
  7: 'سات',
  8: 'آٹھ',
  9: 'نو',
  10: 'دس',
  11: 'گیارہ',
  12: 'بارہ',
  13: 'تیرہ',
  14: 'چودہ',
  15: 'پندرہ',
  16: 'سولہ',
  17: 'سترہ',
  18: 'اٹھارہ',
  19: 'انیس',
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function makeRound() {
  const useAddition = Math.random() > 0.4;
  const a = 1 + Math.floor(Math.random() * 9);
  const b = useAddition ? 1 + Math.floor(Math.random() * 9) : 1 + Math.floor(Math.random() * a);
  const answer = useAddition ? a + b : a - b;
  const wrongPool = shuffle(Array.from({ length: 20 }, (_, i) => i).filter((n) => n !== answer && n >= 0)).slice(0, 3);
  const options = shuffle([answer, ...wrongPool]);
  return { a, b, op: useAddition ? '+' : '-', answer, options };
}

/** Same simple addition/subtraction within 10 as SimpleMathGame, re-skinned bilingual (English + Urdu number words). */
export function UrduAddSubtractGame({ onCorrect }: { onCorrect?: () => void } = {}) {
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
      <p className="text-center text-2xl font-black text-indigo-700">
        Solve it! <span className="block text-lg">حل کرو!</span>
      </p>
      <div className="rounded-[2rem] bg-gradient-to-br from-indigo-400 to-blue-600 px-10 py-6 text-6xl font-black text-white shadow-xl">
        {round.a} {round.op} {round.b} = ?
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {round.options.map((value, index) => (
          <button
            key={`${value}-${index}`}
            type="button"
            onClick={() => pick(value)}
            className="flex h-24 w-20 flex-col items-center justify-center gap-0.5 rounded-3xl bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-lg transition active:scale-95"
          >
            <span className="text-3xl leading-none font-black">{value}</span>
            <span className={`${notoNastaliqUrdu.className} text-sm leading-none`} dir="rtl" lang="ur">
              {URDU_NUMBERS[value] ?? value}
            </span>
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
