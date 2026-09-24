'use client';

import { useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';
import { notoNastaliqUrdu } from '@/lib/fonts/urdu';

const ITEMS = [
  { emoji: '🐶', urdu: 'کتا', english: 'Dog' },
  { emoji: '🐱', urdu: 'بلی', english: 'Cat' },
  { emoji: '🐄', urdu: 'گائے', english: 'Cow' },
  { emoji: '🐦', urdu: 'چڑیا', english: 'Bird' },
  { emoji: '🍎', urdu: 'سیب', english: 'Apple' },
  { emoji: '🍌', urdu: 'کیلا', english: 'Banana' },
  { emoji: '🍊', urdu: 'مالٹا', english: 'Orange' },
  { emoji: '🍉', urdu: 'تربوز', english: 'Watermelon' },
  { emoji: '👨', urdu: 'ابو', english: 'Father' },
  { emoji: '👩', urdu: 'امی', english: 'Mother' },
  { emoji: '👦', urdu: 'بھائی', english: 'Brother' },
  { emoji: '👧', urdu: 'بہن', english: 'Sister' },
  { emoji: '☀️', urdu: 'سورج', english: 'Sun' },
  { emoji: '🌙', urdu: 'چاند', english: 'Moon' },
  { emoji: '💧', urdu: 'پانی', english: 'Water' },
  { emoji: '🏠', urdu: 'گھر', english: 'House' },
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
  const target = ITEMS[Math.floor(Math.random() * ITEMS.length)]!;
  const wrongPool = shuffle(ITEMS.filter((item) => item.english !== target.english)).slice(0, 3);
  const options = shuffle([target, ...wrongPool]);
  return { target, options };
}

/** Everyday vocabulary (animals, fruits, family, home) — Urdu word for a shown picture.
 * Distinct vocab set from ShapeColorMatchGame (shapes/colors) so the /kids/urdu tabs don't overlap. */
export function UrduWordPictureMatchGame({ onCorrect }: { onCorrect?: () => void } = {}) {
  const [round, setRound] = useState(makeRound);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const pick = (english: string) => {
    if (feedback) return;
    if (english === round.target.english) {
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
      <p className="text-center text-2xl font-black text-emerald-700">
        What is this called in Urdu? <span className="block text-lg">اردو میں اسے کیا کہتے ہیں؟</span>
      </p>
      <div className="rounded-[2rem] bg-emerald-50 p-8 text-7xl shadow-inner dark:bg-emerald-950/30">{round.target.emoji}</div>
      <div className="grid grid-cols-2 gap-4">
        {round.options.map((item, index) => (
          <button
            key={`${item.english}-${index}`}
            type="button"
            onClick={() => pick(item.english)}
            className="flex w-32 flex-col items-center gap-1 rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 px-3 py-4 text-white shadow-lg transition active:scale-95"
          >
            <span className={`${notoNastaliqUrdu.className} text-3xl leading-none`} dir="rtl" lang="ur">
              {item.urdu}
            </span>
            <span className="text-sm font-bold">{item.english}</span>
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
