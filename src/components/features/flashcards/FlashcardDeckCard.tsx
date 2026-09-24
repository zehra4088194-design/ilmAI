'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// Curated icon + gradient combos students can pick when creating a deck.
// Keeping this as a small fixed palette (rather than a free colour picker)
// keeps every deck card looking intentional rather than randomly coloured.
export const DECK_COVERS = [
  { icon: 'ðŸ“˜', color: '#7c3aed', gradient: 'from-violet-500 to-indigo-500' },
  { icon: 'ðŸ§ª', color: '#ec4899', gradient: 'from-pink-500 to-rose-500' },
  { icon: 'ðŸ§®', color: '#f59e0b', gradient: 'from-amber-500 to-orange-500' },
  { icon: 'ðŸŒ', color: '#10b981', gradient: 'from-emerald-500 to-teal-500' },
  { icon: 'âš›ï¸', color: '#0ea5e9', gradient: 'from-sky-500 to-blue-500' },
  { icon: 'ðŸ“œ', color: '#f97316', gradient: 'from-orange-500 to-red-500' },
  { icon: 'ðŸ’»', color: '#6366f1', gradient: 'from-indigo-500 to-violet-500' },
  { icon: 'ðŸŽ¨', color: '#d946ef', gradient: 'from-fuchsia-500 to-pink-500' },
];

export function coverForColor(color: string) {
  return DECK_COVERS.find(c => c.color === color) || DECK_COVERS[0]!;
}

interface Deck {
  id: string;
  name: string;
  cover_color: string;
  cover_icon?: string;
  total_cards: number;
  dueCount?: number;
}

export function FlashcardDeckCard({ deck, onClick }: { deck: Deck; onClick: () => void }) {
  const cover = coverForColor(deck.cover_color);

  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-200 border-none"
    >
      <div className={cn('h-20 bg-gradient-to-br flex items-center justify-between px-5', cover.gradient)}>
        <span className="text-3xl drop-shadow-sm">{deck.cover_icon || cover.icon}</span>
        <Layers className="w-5 h-5 text-white/40" />
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold truncate mb-1">{deck.name}</h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{deck.total_cards} cards</span>
          {typeof deck.dueCount === 'number' && deck.dueCount > 0 && (
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <Clock className="w-3 h-3" />{deck.dueCount} due
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
