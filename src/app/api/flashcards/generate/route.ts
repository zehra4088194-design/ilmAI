import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateFlashcardsViaGateway } from '@/lib/ai/gateway';
import { checkAiMessageLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limit = await checkAiMessageLimit(user.id, tier, 'flashcards');
    if (!limit.success) return NextResponse.json({ status: 'error', error: await getConfiguredLimitExceededMessage(tier, 'Flashcards AI') }, { status: 429 });

    const { topic, subjectId, count = 10 } = await req.json();
    if (!topic) return NextResponse.json({ status: 'error', error: 'Topic required hai' }, { status: 400 });

    const aiResult = await generateFlashcardsViaGateway(topic, subjectId || 'General', count, 'groq', 'mini');
    const cleaned = aiResult.replace(/```json|```/g, '').trim();
    const cards = JSON.parse(cleaned);

    // flashcard_decks.id and flashcards.id are both `uuid default
    // uuid_generate_v4()` in the schema, so we let Postgres generate them and
    // read them back via .select() â€” don't assign our own ids here (nanoid()
    // strings are NOT valid uuids and fail insertion).
    const { data: deck, error: deckError } = await supabase.from('flashcard_decks').insert({
      user_id: user.id, name: topic, subject_id: subjectId || null,
      cover_color: '#7c3aed', is_public: false, total_cards: cards.length,
    }).select('id').single();
    if (deckError || !deck) throw deckError || new Error('Deck create nahi hua');

    const deckId = deck.id;
    const cardRows = cards.map((c: { front: string; back: string; hint?: string }) => ({
      user_id: user.id, deck_id: deckId, front: c.front, back: c.back,
      hint: c.hint || null, difficulty: 'MEDIUM', next_review_at: new Date().toISOString(),
      interval: 1, ease_factor: 2.5, repetitions: 0, is_starred: false,
    }));
    const { error: cardsError } = await supabase.from('flashcards').insert(cardRows);
    if (cardsError) throw cardsError;

    return NextResponse.json({ status: 'success', data: { deckId, cardCount: cards.length } });
  } catch (error) {
    console.error('Flashcard generation error:', error);
    return NextResponse.json({ status: 'error', error: 'Flashcards generate nahi ho sake' }, { status: 500 });
  }
}
