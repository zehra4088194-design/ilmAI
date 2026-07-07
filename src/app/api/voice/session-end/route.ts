import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkModelTierLimit } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';

// NOTE: notes/flashcard_decks/flashcards.id are all `uuid default
// uuid_generate_v4()` in the schema — we deliberately let Postgres generate
// these ids and read them back via .select(), rather than assigning our own
// (nanoid() strings are NOT valid uuids and would fail insertion; that
// mismatch exists in the current /api/flashcards/generate route today and
// is worth a follow-up fix there separately).

export const runtime = 'nodejs';
export const maxDuration = 30;

interface SessionEndBody {
  transcript: string;
  subjectId?: string;
  subjectName?: string;
}

interface MagicNotesResult {
  noteTitle: string;
  noteContent: string;
  flashcards: { front: string; back: string; hint?: string }[];
}

// Fired by LiveVoiceCall right after a voice lesson ends (client-side, once
// the transcript is substantial). Turns the transcript into:
// 1. Short Notes -> inserted into the existing `notes` table
// 2. Flashcards -> inserted into the existing `flashcard_decks` + `flashcards`
//    tables, same insert shape as /api/flashcards/generate, so they show up
//    in the student's normal deck list under the correct subject.
//
// Live Voice Call itself is Elite-only (see /api/ai/live/session), so every
// caller here is already an Elite user — we still respect the daily Gemini
// quota and fall back to Groq if it's exhausted, rather than blocking the
// feature outright (this is a bonus on top of the call, not the call itself,
// so a quiet quality downgrade is better than an error).
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });

    const { transcript, subjectId, subjectName } = (await req.json().catch(() => ({}))) as Partial<SessionEndBody>;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ status: 'success', message: 'Transcript nahi mila, skip kar diya' });
    }

    const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 40) {
      return NextResponse.json({ status: 'success', message: 'Session bohot chota tha, notes nahi banaye' });
    }

    const prompt = `Yeh ek student aur AI Teacher ke beech hue voice lesson ki transcript hai${subjectName ? ` (subject: ${subjectName})` : ''}.

Ismein se:
1. Ek chota, clear "Short Notes" summary banao — markdown mein, headings/bullets ke sath, Roman Urdu + English mix (jaisi baaki app mein tone hai)
2. 5-8 high-value spaced-repetition flashcards banao jo is lesson ke key concepts test karein

Transcript:
"""
${transcript.slice(0, 12000)}
"""

Return ONLY valid JSON, no markdown fences, no extra text:
{"noteTitle":"...", "noteContent":"... (markdown)", "flashcards":[{"front":"...","back":"...","hint":"..."}]}`;

    const messages = [
      { role: 'system' as const, content: 'Expert study-notes and flashcard creator for Pakistani/Indian students. Return only valid JSON.' },
      { role: 'user' as const, content: prompt },
    ];

    // Prefer Gemini (per the product spec) while the daily quota lasts;
    // quietly drop to Groq once it's spent — same silent-fallback philosophy
    // already used by the gateway/worker for provider outages.
    let result;
    const geminiQuota = await checkModelTierLimit(user.id, 'gemini', 'mini');
    if (geminiQuota.success) {
      result = await gatewayChat({ provider: 'gemini', tier: 'mini', messages, maxTokens: 3072, temperature: 0.4 });
    } else {
      result = await gatewayChat({ provider: 'groq', tier: 'medium', messages, maxTokens: 3072, temperature: 0.4 });
    }

    const parsed = parseAiJson<MagicNotesResult>(result.text, { noteTitle: 'Voice Lesson Notes', noteContent: '', flashcards: [] });

    if (!parsed.noteContent && (!parsed.flashcards || parsed.flashcards.length === 0)) {
      return NextResponse.json({ status: 'error', error: 'Notes generate nahi ho sake' }, { status: 500 });
    }

    // 1. Short Notes -> existing `notes` table (uuid id, Postgres-generated)
    let noteId: string | null = null;
    if (parsed.noteContent) {
      const { data: noteRow, error: noteError } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: parsed.noteTitle || 'Voice Lesson Notes',
          content: parsed.noteContent,
          subject_id: subjectId || null,
          tags: ['voice-lesson', 'auto-generated'],
        })
        .select('id')
        .single();
      if (noteError) throw noteError;
      noteId = noteRow?.id ?? null;
    }

    // 2. Flashcards -> existing `flashcard_decks` + `flashcards` tables
    let deckId: string | null = null;
    if (parsed.flashcards && parsed.flashcards.length > 0) {
      const { data: deckRow, error: deckError } = await supabase
        .from('flashcard_decks')
        .insert({
          user_id: user.id,
          name: parsed.noteTitle ? `${parsed.noteTitle} - Flashcards` : 'Voice Lesson Flashcards',
          subject_id: subjectId || null,
        })
        .select('id')
        .single();
      if (deckError) throw deckError;
      deckId = deckRow?.id ?? null;

      if (deckId) {
        const deckIdForCards = deckId;
        const cardsToInsert = parsed.flashcards.map((c) => ({
          user_id: user.id,
          deck_id: deckIdForCards,
          front: c.front,
          back: c.back,
          hint: c.hint || null,
        }));
        const { error: cardsError } = await supabase.from('flashcards').insert(cardsToInsert);
        if (cardsError) throw cardsError;
      }
    }

    return NextResponse.json({ status: 'success', data: { noteId, deckId } });
  } catch (error) {
    console.error('Voice session-end error:', error);
    return NextResponse.json({ status: 'error', error: 'Notes/flashcards banate waqt error aa gaya' }, { status: 500 });
  }
}
