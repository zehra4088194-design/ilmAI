'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Volume2 } from 'lucide-react';
import { logKidsActivity } from '@/lib/kids/logActivity';

const ITEMS = [
  { text: 'Apple', emoji: '🍎' },
  { text: 'Cat', emoji: '🐱' },
  { text: 'Dog', emoji: '🐶' },
  { text: 'Sun', emoji: '☀️' },
  { text: 'Ball', emoji: '⚽' },
  { text: 'Star', emoji: '⭐' },
  { text: 'Fish', emoji: '🐟' },
  { text: 'Tree', emoji: '🌳' },
  { text: 'Car', emoji: '🚗' },
  { text: 'Book', emoji: '📚' },
  { text: 'House', emoji: '🏠' },
  { text: 'Flower', emoji: '🌸' },
];

export default function KidsListenRepeatPage() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const router = useRouter();

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const markDone = async (text: string) => {
    if (done.has(text)) return;
    setDone((prev) => new Set(prev).add(text));
    const result = await logKidsActivity('listen-repeat', text, 2);
    if (result) router.refresh();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-violet-700 dark:text-violet-200">Listen &amp; Repeat 🔊</h1>
        <p className="text-sm font-semibold text-violet-500/80 dark:text-violet-300/70">
          Tap the speaker, listen carefully, then say the word out loud!
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {ITEMS.map((item) => (
          <div key={item.text} className="flex flex-col items-center gap-2 rounded-[1.75rem] bg-white/85 p-4 text-center shadow-lg dark:bg-white/10">
            <span className="text-4xl">{item.emoji}</span>
            <span className="text-sm font-black text-violet-700 dark:text-violet-200">{item.text}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => speak(item.text)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white shadow-md active:scale-95"
              >
                <Volume2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => markDone(item.text)}
                disabled={done.has(item.text)}
                className={`flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold text-white shadow-md active:scale-95 ${
                  done.has(item.text) ? 'bg-emerald-500' : 'bg-violet-600'
                }`}
              >
                <Check className="h-3.5 w-3.5" /> {done.has(item.text) ? 'Said it!' : 'I said it!'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
