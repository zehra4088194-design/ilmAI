import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { consumeAiCredits } from '@/lib/rate-limit';
import { gatewayChat, type AiProviderId, type ModelTier } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';
import type { PresentationSlide } from '@/lib/presentation/types';
import { normalizePresentationDeck } from '@/lib/presentation/generator';

export const runtime = 'nodejs';
export const maxDuration = 180;

function cleanString(value: unknown, fallback = '', max = 500) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

async function savePresentationHistory(userId: string, topic: string, deck: unknown) {
  const { createServiceClient } = await import('@/lib/supabase/service');
  const admin = createServiceClient() as any;
  const { error } = await admin.from('presentations').insert({ user_id: userId, title: topic, deck_json: deck });
  if (error) throw error;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const body = await req.json();
    const topic = cleanString(body.topic, '', 300);
    const subject = cleanString(body.subject, 'General');
    const slideIndex = Number(body.slideIndex);
    if (topic.length < 3 || !Number.isFinite(slideIndex)) {
      return NextResponse.json({ status: 'error', error: 'Invalid request' }, { status: 400 });
    }

    const currentSlide = body.currentSlide as PresentationSlide | undefined;
    if (!currentSlide) {
      return NextResponse.json({ status: 'error', error: 'Current slide data required' }, { status: 400 });
    }

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const routingPolicy = 'presentation' as const;

    const systemPrompt = `You are an expert university-level presentation content writer.\nReturn only clean JSON. No markdown fences or explanation.\nKeep the same slide type as the original and use this schema:\n{\n  "type": "${currentSlide.type}",\n  "title": "string",\n  "subtitle": "optional string",\n  "bullets": ["short point"],\n  "quote": "optional string",\n  "author": "optional string",\n  "stats": [{"value": "92%", "label": "short label"}],\n  "chartType": "pie | bar | line",\n  "chartData": [{"label": "category", "value": 25}],\n  "chartNote": "data source or clearly label illustrative values",\n  "left": {"heading": "string", "bullets": ["..."]},\n  "right": {"heading": "string", "bullets": ["..."]},\n  "speakerNotes": "80-130 words"\n}\nBullets must be 8-16 words where applicable. Titles should communicate an insight. For chart slides, preserve the chart type and return at least two labeled numeric data points. Match the requested language.`;

    const userPrompt = `Topic: ${topic}\nSubject/course: ${subject}\nOriginal slide:\n${JSON.stringify(currentSlide, null, 2)}\n\nRegenerate this slide with substantially improved, accurate and engaging content.`;

    const provider: AiProviderId = 'gemini';
    const modelTier: ModelTier = 'medium';
    const result = await gatewayChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      provider,
      tier: modelTier,
      routingPolicy,
      temperature: 0.7,
      maxTokens: 1500,
      validateResponse: (text) => text.trim().startsWith('{') && text.trim().endsWith('}'),
    });

    const parsed = parseAiJson<PresentationSlide | null>(result.text, null);
    if (!parsed || !parsed.type || !parsed.title) {
      return NextResponse.json({ status: 'error', error: 'AI response was invalid. Try again.' }, { status: 502 });
    }
    const normalizedSlide = normalizePresentationDeck(
      { topic, slides: [{ type: 'title' }, parsed, { type: 'closing' }] },
      topic
    ).slides[1];
    if (!normalizedSlide) {
      return NextResponse.json({ status: 'error', error: 'AI response was invalid. Try again.' }, { status: 502 });
    }

    await consumeAiCredits(user.id, tier, 'university_presentation');

    try {
      const fullDeck = body.fullDeck as any;
      if (fullDeck?.slides) await savePresentationHistory(user.id, topic, fullDeck);
    } catch {
      // History is non-fatal.
    }

    return NextResponse.json({ status: 'success', slide: normalizedSlide });
  } catch (error) {
    console.error('regenerate-slide error:', error);
    return NextResponse.json({ status: 'error', error: 'Failed to regenerate slide' }, { status: 500 });
  }
}
