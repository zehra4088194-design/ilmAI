'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const FALLBACK_QUOTES = [
  'Chhota sa consistent step bhi kal ke confidence ko strong bana deta hai.',
  'Aaj ka focused 25 minutes kal ke exam hall mein sukoon ban kar aata hai.',
  'Galti answer ka end nahi hoti, concept clear hone ka shortcut hoti hai.',
  'Tumhara pace tumhara hai. Bas rukna nahi, revise karte rehna.',
  'Difficult topic ko tod do: definition, formula, example, practice.',
];

export function MotivationCarousel({ subjectName }: { subjectName?: string }) {
  const [quotes, setQuotes] = useState(FALLBACK_QUOTES);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ai/motivation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: subjectName }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => {
        if (!cancelled && Array.isArray(json?.quotes) && json.quotes.length > 0) {
          setQuotes(json.quotes.slice(0, 8));
          setIndex(0);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [subjectName]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % quotes.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [quotes.length]);

  return (
    <div className="px-4 pt-3">
      <div className="relative overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-background to-indigo-500/10 px-3 py-2">
        <div className="absolute inset-y-0 left-0 w-16 bg-violet-500/10 blur-2xl" />
        <div className="relative flex items-center gap-2 text-xs sm:text-sm">
          <Sparkles className="h-4 w-4 shrink-0 text-violet-400" />
          <p key={index} className={cn('animate-in fade-in slide-in-from-bottom-1 duration-500 text-muted-foreground')}>
            <span className="font-semibold text-foreground">Motivation:</span> {quotes[index]}
          </p>
        </div>
      </div>
    </div>
  );
}
