import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAiMessageLimit, consumeAiCredits } from '@/lib/rate-limit';
import { gatewayChat, type AiProviderId, type ModelTier } from '@/lib/ai/gateway';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';
import type { PresentationSlide } from '@/lib/presentation/types';

export const runtime = 'nodejs';
export const maxDuration = 180;

function cleanString(value: unknown, fallback = '', max = 500) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

// Best-effort history save into public.presentations. Never blocks/fails generation.
async function savePresentationHistory(userId: string, topic: string, deck: unknown) {
  const { createServiceClient } = await import('@/lib/supabase/service');
  const admin = createServiceClient() as any;
  const { error } = await admin.from('presentations').insert({
    user_id: userId,
    title: topic,
    deck_json: deck,
  });
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

    const currentSlide = body.currentSlide as PresentationSlide;
    if (!currentSlide) {
      return NextResponse.json({ status: 'error', error: 'Current slide data required' }, { status: 400 });
    }

    // Check AI credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const aiLimit = await (await import('@/lib/rate-limit')).checkAiMessageLimit(user.id, tier, 'university_presentation');
    if (!aiLimit.success) {
      return NextResponse.json(
        { status: 'error', error: 'The shared AI credit balance has been used.' },
        { status: 429 }
      );
    }

    // Build prompt for regenerating just this one slide
    const systemPrompt = `You are an expert university-level presentation content writer.
Your job is to REGENERATE a single slide for a premium PowerPoint-style university presentation.

Strict rules:
1. Return only clean JSON. No markdown fences, no explanation.
2. Use this EXACT schema matching the original slide type:
{
  "type": "${currentSlide.type}",
  "title": "string - must communicate an insight, not generic",
  "subtitle": "optional string",
  "bullets": ["short point 1", "short point 2"],
  "quote": "optional string",
  "author": "optional string",
  "stats": [{"value": "92%", "label": "short label"}],
  "left": {"heading": "string", "bullets": ["..."]},
  "right": {"heading": "string", "bullets": ["..."]},
  "speakerNotes": "80-130 words of detailed speaker notes"
}
3. Keep the same slide type as the original.
4. Improve the content significantly - better insights, clearer bullets, more engaging.
5. Each bullet should be 8-16 words maximum.
6. Include practical examples, key terms, viva-ready ideas.
7. Slide titles must communicate an insight, not generic labels.
8. Match the requested language. Use Roman Urdu/Urdu-English only when requested.`;

    const userPrompt = `Topic: ${topic}
Subject/course: ${subject}
Original slide (type: ${currentSlide.type}):
${JSON.stringify(currentSlide, null, 2)}

Regenerate this slide with improved content. Keep the same structure but make it more insightful and engaging.`;

    // Get AI provider
    const providerInfo = await resolveAiRoutingProvider('university_presentation');
    const providerId: AiProviderId = providerInfo?.provider || 'openai';
    const modelTier: ModelTier = providerInfo?.tier || 'standard';

    const result = await gatewayChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      provider: providerId,
      modelTier,
      temperature: 0.7,
      maxTokens: 1500,
    });

    const parsed = parseAiJson<PresentationSlide>(result.content, {});
    
    if (!parsed.type || !parsed.title) {
      return NextResponse.json(
        { status: 'error', error: 'AI response was invalid. Try again.' },
        { status: 502 }
      );
    }

    // Consume AI credits
    await consumeAiCredits(user.id, tier, 'university_presentation');

    // Save updated deck to history
    try {
      const fullDeck = body.fullDeck as any;
      if (fullDeck?.slides) {
        await savePresentationHistory(user.id, topic, fullDeck);
      }
    } catch {
      // Non-fatal - don't fail regeneration if history save fails
    }

    return NextResponse.json({ 
      status: 'success', 
      slide: parsed 
    });

  } catch (error) {
    console.error('regenerate-slide error:', error);
    return NextResponse.json(
      { status: 'error', error: 'Failed to regenerate slide' },
      { status: 500 }
    );
  }
}
