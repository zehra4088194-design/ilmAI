'use client';

import { useState } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';
import { notoNastaliqUrdu } from '@/lib/fonts/urdu';

const EMOJIS = ['🍎', '⭐', '🐶', '🎈', '🚗', '🌸', '🐝', '🍪'];

const NUMBER_WORDS = [
  { value: 1, urdu: 'ایک', english: 'One' },
  { value: 2, urdu: 'دو', english: 'Two' },
  { value: 3, urdu: 'تین', english: 'Three' },
  { value: 4, urdu: 'چار', english: 'Four' },
  { value: 5, urdu: 'پانچ', english: 'Five' },
  { value: 6, urdu: 'چھ', english: 'Six' },
  { value: 7, urdu: 'سات', english: 'Seven' },
  { value: 8, urdu: 'آٹھ', english: 'Eight' },
  { value: 9, urdu: 'نو', english: 'Nine' },
  { value: 10, urdu: 'دس', english: 'Ten' },
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
  const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]!;
  const correct = NUMBER_WORDS[Math.floor(Math.random() * NUMBER_WORDS.length)]!;
  const wrongPool = shuffle(NUMBER_WORDS.filter((word) => word.value !== correct.value)).slice(0, 3);
  const options = shuffle([correct, ...wrongPool]);
  return { emoji, correct, options };
}

/** Count the objects, tap the matching Urdu number-word — bilingual (Urdu + English) counting practice. */
export function NumberWordMatchGame({ onCorrect }: { onCorrect?: () => void } = {}) {
  const [round, setRound] = useState(makeRound);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const pick = (value: number) => {
    if (feedback) return;
    if (value === round.correct.value) {
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
      <p className="text-center text-2xl font-black text-teal-700">
        Count, then tap the Urdu word! <span className="block text-lg">گنو اور صحیح لفظ دبائیں!</span>
      </p>
      <div className="flex max-w-md flex-wrap items-center justify-center gap-3 rounded-[2rem] bg-teal-50 p-6 text-5xl dark:bg-teal-950/30">
        {Array.from({ length: round.correct.value }).map((_, index) => (
          <span key={index}>{round.emoji}</span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {round.options.map((word, index) => (
          <button
            key={`${word.value}-${index}`}
            type="button"
            onClick={() => pick(word.value)}
            className="flex w-32 flex-col items-center gap-1 rounded-3xl bg-gradient-to-br from-teal-400 to-cyan-600 px-3 py-4 text-white shadow-lg transition active:scale-95"
          >
            <span className={`${notoNastaliqUrdu.className} text-3xl leading-none`} dir="rtl" lang="ur">
              {word.urdu}
            </span>
            <span className="text-sm font-bold">{word.english}</span>
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
