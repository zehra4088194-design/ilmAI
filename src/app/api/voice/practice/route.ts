import { NextRequest, NextResponse } from 'next/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';
import { createClient } from '@/lib/supabase/server';
import { checkAiMessageLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LANGUAGES = ['en', 'ur', 'hi'] as const;
const MAX_AUDIO_SIZE = 4 * 1024 * 1024;

function normalizeLanguage(value: unknown): (typeof LANGUAGES)[number] {
  return typeof value === 'string' && LANGUAGES.includes(value as (typeof LANGUAGES)[number])
    ? (value as (typeof LANGUAGES)[number])
    : 'en';
}

export async function GET(req: NextRequest) {
  try {
    const language = normalizeLanguage(req.nextUrl.searchParams.get('language'));
    const difficulty = req.nextUrl.searchParams.get('difficulty') || 'intermediate';
    const result = await gatewayChat({
      provider: 'gemini',
      tier: 'mini',
      messages: [
        {
          role: 'system',
          content: 'Create one short speaking practice prompt for a student. Return only plain text, no markdown.',
        },
        {
          role: 'user',
          content: `Language: ${language}. Difficulty: ${difficulty}. Make it useful for pronunciation and viva confidence.`,
        },
      ],
      maxTokens: 120,
      temperature: 0.7,
    });
    return NextResponse.json({ status: 'success', data: { prompt: result.text.trim() } });
  } catch {
    return NextResponse.json({
      status: 'success',
      data: { prompt: 'Explain your favorite topic from today in three clear sentences.' },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = ((profile as any)?.subscription_tier || 'FREE') as SubscriptionTier;
    const limit = await checkAiMessageLimit(user.id, tier, 'speaking_practice');
    if (!limit.success) {
      return NextResponse.json(
        { status: 'error', error: await getConfiguredLimitExceededMessage(tier, 'Speaking Practice') },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const promptText = String(formData.get('prompt_text') || '').trim();
    const transcript = String(formData.get('transcript') || '').trim();
    const language = normalizeLanguage(formData.get('language'));
    const audio = formData.get('audio') as File | null;
    if (!promptText || !transcript) {
      return NextResponse.json({ status: 'error', error: 'A prompt and transcript are required.' }, { status: 400 });
    }
    if (audio && audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ status: 'error', error: 'The audio file must be smaller than 4 MB.' }, { status: 400 });
    }

    let audioPath: string | null = null;
    if (audio && audio.size > 0) {
      const sessionId = crypto.randomUUID();
      const ext = audio.type.includes('webm') ? 'webm' : 'audio';
      audioPath = `${user.id}/${sessionId}.${ext}`;
      const buffer = Buffer.from(await audio.arrayBuffer());
      const upload = await supabase.storage.from('speaking-practice-audio').upload(audioPath, buffer, {
        contentType: audio.type || 'audio/webm',
        upsert: false,
      });
      if (upload.error) throw upload.error;
    }

    const result = await gatewayChat({
      provider: 'gemini',
      tier: tier === 'ELITE' ? 'medium' : 'mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a pronunciation coach. Return JSON with keys score (0-100), feedback, follow_up_question, quick_revision_notes.',
        },
        {
          role: 'user',
          content: `Language: ${language}\nExpected prompt:\n${promptText}\n\nStudent transcript:\n${transcript}\n\nAssess clarity, fluency, grammar, confidence, and pronunciation risks from transcript.`,
        },
      ],
      maxTokens: 900,
      temperature: 0.35,
    });

    const parsed = parseAiJson<{
      score: number;
      feedback: string;
      follow_up_question?: string;
      quick_revision_notes?: string;
    }>(result.text, {
      score: 70,
      feedback: result.text,
    });
    const feedback = `${parsed.feedback || result.text}${parsed.follow_up_question ? `\n\nFollow-up: ${parsed.follow_up_question}` : ''}${parsed.quick_revision_notes ? `\n\nQuick revision: ${parsed.quick_revision_notes}` : ''}`;

    const { data } = await db
      .from('speaking_practice_sessions')
      .insert({
        student_id: user.id,
        language,
        prompt_text: promptText,
        audio_url: audioPath,
        transcript,
        pronunciation_score: Number(parsed.score) || null,
        ai_feedback: feedback,
      })
      .select('id')
      .single();

    return NextResponse.json({ status: 'success', data: { id: data?.id, score: parsed.score, feedback } });
  } catch (error) {
    console.error('Speaking practice error:', error);
    return NextResponse.json({ status: 'error', error: 'Speaking practice could not be saved.' }, { status: 500 });
  }
}
