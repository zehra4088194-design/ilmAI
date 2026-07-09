import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FlashcardStudyMode } from '@/components/features/flashcards/FlashcardStudyMode';

export default async function FlashcardStudyPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: deck } = await supabase
    .from('flashcard_decks')
    .select('id, name')
    .eq('id', deckId)
    .eq('user_id', user!.id)
    .single();

  if (!deck) notFound();

  const { data: cards } = await supabase
    .from('flashcards')
    .select('id, front, back, hint, interval, ease_factor, repetitions')
    .eq('deck_id', deckId)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true });

  return (
    <div className="max-w-5xl mx-auto">
      <FlashcardStudyMode deckId={deck.id} deckName={deck.name} cards={cards || []} />
    </div>
  );
}
