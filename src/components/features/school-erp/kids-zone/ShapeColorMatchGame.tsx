'use client';

import { useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';
import { notoNastaliqUrdu } from '@/lib/fonts/urdu';

const ITEMS = [
  { emoji: '⚪', urdu: 'دائرہ', english: 'Circle' },
  { emoji: '🟦', urdu: 'مربع', english: 'Square' },
  { emoji: '🔺', urdu: 'مثلث', english: 'Triangle' },
  { emoji: '⭐', urdu: 'ستارہ', english: 'Star' },
  { emoji: '❤️', urdu: 'دل', english: 'Heart' },
  { emoji: '🔴', urdu: 'لال', english: 'Red' },
  { emoji: '🔵', urdu: 'نیلا', english: 'Blue' },
  { emoji: '🟢', urdu: 'سبز', english: 'Green' },
  { emoji: '🟡', urdu: 'پیلا', english: 'Yellow' },
  { emoji: '🟣', urdu: 'جامنی', english: 'Purple' },
  { emoji: '🟠', urdu: 'نارنجی', english: 'Orange' },
  { emoji: '🩷', urdu: 'گلابی', english: 'Pink' },
  { emoji: '🟤', urdu: 'بھورا', english: 'Brown' },
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

/** Shapes & colors — tap the bilingual (Urdu + English) name matching the shown emoji. */
export function ShapeColorMatchGame({ onCorrect }: { onCorrect?: () => void } = {}) {
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
      <p className="text-center text-2xl font-black text-fuchsia-700">
        What is this? <span className="block text-lg">یہ کیا ہے؟</span>
      </p>
      <div className="rounded-[2rem] bg-fuchsia-50 p-8 text-7xl shadow-inner dark:bg-fuchsia-950/30">
        {round.target.emoji}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {round.options.map((item, index) => (
          <button
            key={`${item.english}-${index}`}
            type="button"
            onClick={() => pick(item.english)}
            className="flex w-32 flex-col items-center gap-1 rounded-3xl bg-gradient-to-br from-fuchsia-400 to-purple-600 px-3 py-4 text-white shadow-lg transition active:scale-95"
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
