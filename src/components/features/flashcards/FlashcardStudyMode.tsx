'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint: string | null;
  interval: number;
  ease_factor: number;
  repetitions: number;
}

const RATINGS = [
  { key: 'again', label: 'Dobara', sub: '<1 din', color: 'bg-rose-500 hover:bg-rose-400', ease: -0.2 },
  { key: 'hard', label: 'Mushkil', sub: '1 din', color: 'bg-amber-500 hover:bg-amber-400', ease: -0.05 },
  { key: 'good', label: 'Theek', sub: '3 din', color: 'bg-emerald-500 hover:bg-emerald-400', ease: 0 },
  { key: 'easy', label: 'Asaan', sub: '7 din', color: 'bg-sky-500 hover:bg-sky-400', ease: 0.15 },
] as const;

// Simplified SM-2 style scheduler. Keeps the existing interval/ease_factor/
// repetitions columns meaningful without pulling in a full spaced-repetition
// library â€” good enough for a self-rated flashcard deck.
function nextSchedule(card: Flashcard, rating: (typeof RATINGS)[number]) {
  let { interval, ease_factor: ease, repetitions: reps } = card;

  if (rating.key === 'again') {
    reps = 0;
    interval = 1;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.round(interval * ease);
  }
  ease = Math.max(1.3, ease + rating.ease);

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + Math.max(1, interval));

  return { interval: Math.max(1, interval), ease_factor: ease, repetitions: reps, next_review_at: nextReviewAt.toISOString() };
}

export function FlashcardStudyMode({ deckId, deckName, cards }: { deckId: string; deckName: string; cards: Flashcard[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [rating, setRating] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  const card = cards[index];
  const progress = useMemo(() => (cards.length ? Math.round((reviewedCount / cards.length) * 100) : 0), [reviewedCount, cards.length]);
  const isDone = index >= cards.length;

  const rate = async (r: (typeof RATINGS)[number]) => {
    if (!card || rating) return;
    setRating(true);
    const schedule = nextSchedule(card, r);
    const { error } = await supabase.from('flashcards').update({ ...schedule, last_rating: r.key }).eq('id', card.id);
    if (error) toast.error('Progress save nahi hua');

    setReviewedCount(c => c + 1);
    setFlipped(false);
    setRating(false);
    setIndex(i => i + 1);
  };

  if (cards.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="mb-4">Is deck mein koi cards nahi hain.</p>
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Wapas jao</Button>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="flex flex-col items-center text-center py-20" data-deck-id={deckId}>
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-5">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold mb-1">Deck complete! ðŸŽ‰</h2>
        <p className="text-muted-foreground mb-6">{cards.length} cards review kiye &quot;{deckName}&quot; mein.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>Decks pe wapas jao</Button>
          <Button
            variant="gradient"
            className="bg-gradient-to-r from-violet-600 to-fuchsia-500"
            onClick={() => { setIndex(0); setReviewedCount(0); setFlipped(false); }}
          >
            <RotateCw className="w-4 h-4" />Dobara study karo
          </Button>
        </div>
      </div>
    );
  }

  const activeCard = card || cards[0]!;

  return (
    <div className="max-w-xl mx-auto space-y-6" data-deck-id={deckId}>
      {/* Header + progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Exit</Button>
          <span className="text-sm text-muted-foreground">{index + 1} / {cards.length}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flip card */}
      <div className="relative h-80 [perspective:1200px]" onClick={() => setFlipped(f => !f)}>
        <div
          className={cn(
            'absolute inset-0 rounded-2xl cursor-pointer transition-transform duration-500 [transform-style:preserve-3d]',
            flipped && '[transform:rotateY(180deg)]'
          )}
        >
          {/* Front */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden]">
            <span className="text-[10px] uppercase tracking-wide text-white/60 mb-3">Question</span>
            <p className="text-lg font-semibold text-white">{activeCard.front}</p>
            {activeCard.hint && <p className="text-xs text-white/60 mt-4">ðŸ’¡ {activeCard.hint}</p>}
            <span className="absolute bottom-4 text-[10px] text-white/50">Tap to flip</span>
          </div>
          {/* Back */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-pink-600 flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="text-[10px] uppercase tracking-wide text-white/60 mb-3">Answer</span>
            <p className="text-lg font-semibold text-white">{activeCard.back}</p>
          </div>
        </div>
      </div>

      {/* Difficulty rating â€” only shown once flipped */}
      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map(r => (
            <button
              key={r.key}
              disabled={rating}
              onClick={() => rate(r)}
              className={cn('rounded-xl py-3 text-white text-sm font-medium transition-colors disabled:opacity-60', r.color)}
            >
              <div>{r.label}</div>
              <div className="text-[10px] opacity-80">{r.sub}</div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">Card ko tap karo answer dekhne ke liye</p>
      )}
    </div>
  );
}
