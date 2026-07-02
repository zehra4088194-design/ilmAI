import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { FlashcardDeckGrid } from '@/components/features/study/FlashcardDeck/DeckGrid';
export const metadata: Metadata = { title: 'Flashcards' };

export default async function FlashcardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: decks } = await supabase.from('flashcard_decks').select('*').eq('user_id', user!.id).order('updated_at', { ascending: false });
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Flashcards</h1><p className="text-muted-foreground">Spaced repetition se fast yaad karo</p></div>
      </div>
      <FlashcardDeckGrid decks={decks || []} />
    </div>
  );
}
