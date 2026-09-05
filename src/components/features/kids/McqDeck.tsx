'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PartyPopper, Sparkles } from 'lucide-react';
import { logKidsActivity } from '@/lib/kids/logActivity';

export interface McqItem {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  emoji: string;
  xpReward: number;
  funFact?: string | null;
}

const CARD_COLORS = ['bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-sky-400'];

/** Shared one-question-at-a-time MCQ deck used by GK, standalone Quiz, and the Daily Mini Challenge. */
export function McqDeck({ items, category }: { items: McqItem[]; category: string }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const router = useRouter();
  const item = items[index];

  const pick = async (optionIndex: number) => {
    if (picked !== null || !item) return;
    setPicked(optionIndex);
    if (optionIndex === item.correctIndex) {
      setScore((s) => s + 1);
      const result = await logKidsActivity(category, item.id, item.xpReward);
      if (result) router.refresh();
    }
  };

  const next = () => {
    setPicked(null);
    setIndex((i) => i + 1);
  };

  if (!item) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="flex items-center gap-2 text-xl font-bold text-emerald-600">
          <PartyPopper className="h-6 w-6" /> All done for now!
        </p>
        <p className="text-muted-foreground text-sm">
          You got {score} / {items.length} right. Come back tomorrow for more!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <p className="flex items-center gap-2 text-lg font-bold text-amber-600">
        <Sparkles className="h-5 w-5" /> Score: {score} / {items.length}
      </p>
      <div className="text-6xl">{item.emoji}</div>
      <p className="max-w-md text-center text-xl font-black text-violet-700 dark:text-violet-200">{item.question}</p>
      <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
        {item.options.map((option, optionIndex) => {
          const isCorrect = optionIndex === item.correctIndex;
          const showState = picked !== null;
          return (
            <button
              key={option}
              type="button"
              onClick={() => pick(optionIndex)}
              disabled={picked !== null}
              className={`rounded-2xl px-4 py-3 text-base font-bold text-white shadow-lg transition active:scale-95 ${
                showState && isCorrect
                  ? 'bg-emerald-500'
                  : showState && optionIndex === picked
                    ? 'bg-rose-500'
                    : CARD_COLORS[optionIndex % CARD_COLORS.length]
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="flex flex-col items-center gap-2">
          {picked === item.correctIndex ? (
            <p className="flex items-center gap-2 text-lg font-bold text-emerald-600">
              <PartyPopper className="h-5 w-5" /> Correct! Great job!
            </p>
          ) : (
            <p className="text-lg font-bold text-rose-500">Not quite — the right answer is highlighted!</p>
          )}
          {item.funFact && <p className="text-muted-foreground max-w-sm text-center text-xs">💡 {item.funFact}</p>}
          <button type="button" onClick={next} className="rounded-full bg-violet-600 px-5 py-2 text-sm font-bold text-white shadow-md">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
