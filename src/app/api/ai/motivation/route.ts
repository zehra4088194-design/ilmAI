import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat, GatewayError } from '@/lib/ai/gateway';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import { checkAiMessageLimit, consumeAiCredits, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Last-resort local content. It is used only when every configured AI provider
// in the controlled fallback chain fails or returns unusable output.
const FALLBACK_QUOTES = [
  'One solved question today builds confidence for tomorrow.',
  'If a topic feels difficult, solve the first example and build momentum from there.',
  'Smart study means understanding, recalling, and then testing yourself.',
  'Every revision makes the material feel more familiar and manageable.',
  'Slow progress is still progress. Keep your learning streak active.',
  'Strong concepts lead to stronger results.',
];

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
    // Invalid/truncated AI JSON is an AI generation failure. The route then
    // uses the deterministic local last-resort quotes below.
  }
  return [];
}

function publicMotivationError(error: unknown) {
  if (error instanceof GatewayError && error.status === 429) {
    return 'The AI services are currently at their usage limit. Please try again later.';
  }
  return 'Motivation could not be generated right now.';
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ quotes: FALLBACK_QUOTES });

  const { subject } = await req.json().catch(() => ({}));
  try {
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limit = await checkAiMessageLimit(user.id, tier, 'motivation');
    if (!limit.success) {
      return NextResponse.json(
        { status: 'error', error: await getConfiguredLimitExceededMessage(tier, 'Motivation AI') },
        { status: 429 }
      );
    }

    const motivationProvider = await resolveAiRoutingProvider('studyTools');
    const result = await gatewayChat({
      provider: motivationProvider,
      strictProvider: true,
      routingPolicy: 'text',
      tier: 'mini',
      messages: [
        {
          role: 'system',
          content: 'You write short motivational study quotes for Pakistani students. Return only JSON: {"quotes":["..."]}. No markdown.',
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
    if (!quotes.length) return NextResponse.json({ quotes: FALLBACK_QUOTES });
    await consumeAiCredits(user.id, tier, 'motivation');
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Motivation generation error:', error);
    // AI failure does not leave the dashboard blank; deterministic fallback is
    // only reached after gatewayChat has exhausted the configured AI chain.
    return NextResponse.json({ quotes: FALLBACK_QUOTES, fallback: true, error: publicMotivationError(error) }, { status: 200 });
  }
}
