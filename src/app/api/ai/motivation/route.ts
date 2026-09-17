import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat, GatewayError } from '@/lib/ai/gateway';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import { checkAiMessageLimit, consumeAiCredits, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function parseQuotes(text: string): string[] {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    const json = JSON.parse(cleaned);
    if (Array.isArray(json?.quotes)) {
      return json.quotes
        .filter((q: unknown) => typeof q === 'string' && q.trim())
        .map((q: string) => q.trim())
        .slice(0, 8);
    }
  } catch {
    // Invalid/truncated AI JSON is an AI generation error, not a reason to
    // silently replace the selected provider's response with local content.
  }
  return [];
}

function publicMotivationError(error: unknown) {
  if (error instanceof GatewayError && error.status === 429) {
    return 'The selected AI service has reached its current usage limit. Please try again later.';
  }
  return 'Motivation could not be generated right now. Please try again.';
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

  const { subject } = await req.json().catch(() => ({}));
  try {
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limit = await checkAiMessageLimit(user.id, tier, 'motivation');
    if (!limit.success)
      return NextResponse.json(
        { status: 'error', error: await getConfiguredLimitExceededMessage(tier, 'Motivation AI') },
        { status: 429 }
      );

    const motivationProvider = await resolveAiRoutingProvider('studyTools');
    const result = await gatewayChat({
      provider: motivationProvider,
      strictProvider: true,
      routingPolicy: 'text',
      tier: 'mini',
      messages: [
        {
          role: 'system',
          content:
            'You write short motivational study quotes for Pakistani students. Return only JSON: {"quotes":["..."]}. No markdown.',
        },
        {
          role: 'user',
          content: `Generate 8 warm, fresh, non-cringey motivational quotes in professional, student-friendly English${subject ? ` for ${subject}` : ''}. Keep each quote under 18 words.`,
        },
      ],
      maxTokens: 900,
      temperature: 0.9,
    });
    const quotes = parseQuotes(result.text);
    if (!quotes.length) throw new GatewayError('The selected AI service returned an invalid motivation response.', 502);
    await consumeAiCredits(user.id, tier, 'motivation');
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Motivation generation error:', error);
    return NextResponse.json({ status: 'error', error: publicMotivationError(error) }, { status: 502 });
  }
}