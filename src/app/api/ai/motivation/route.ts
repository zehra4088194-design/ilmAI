import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import { checkAiMessageLimit, consumeAiCredits, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 20;

const FALLBACK_QUOTES = [
  'One solved question today builds confidence for tomorrow.',
  'If a topic feels difficult, solve the first example and build momentum from there.',
  'Smart study means understanding, recalling, and then testing yourself.',
  'Every revision makes the material feel more familiar and manageable.',
  'Slow progress is still progress. Keep your learning streak active.',
  'Strong concepts lead to stronger results.',
];

function parseQuotes(text: string) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    const json = JSON.parse(cleaned);
    if (Array.isArray(json?.quotes)) {
      const valid = json.quotes.filter((q: unknown) => typeof q === 'string' && q.trim());
      if (valid.length) return valid;
    }
  } catch {}
  // JSON.parse above throws whenever the gateway response gets cut off before the closing
  // "]}" (maxTokens headroom, or the model ran long) or arrives wrapped some other way — falling
  // straight to the line-splitter below then left the literal '{"quotes":["...' prefix in the
  // first "quote" shown to the user, since '{' isn't one of the characters that splitter strips.
  // Pull out complete quoted strings directly instead — this still works on truncated JSON as
  // long as each individual quote closed before the cutoff (the one that didn't just gets
  // dropped, which is correct — it's incomplete).
  const matches = cleaned.match(/"((?:[^"\\]|\\.)*)"/g) || [];
  const extracted = matches
    .map((m) => m.slice(1, -1).replace(/\\"/g, '"').trim())
    .filter((q) => q && q.toLowerCase() !== 'quotes' && q.length > 8);
  if (extracted.length) return extracted.slice(0, 8);
  return cleaned
    .split('\n')
    .map((line) => line.replace(/^[-*\d.\s"']+|["']+$/g, '').trim())
    .filter((line) => line && !line.startsWith('{') && !line.startsWith('['))
    .slice(0, 8);
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
    if (quotes.length) await consumeAiCredits(user.id, tier, 'motivation');
    return NextResponse.json({ quotes: quotes.length ? quotes : FALLBACK_QUOTES });
  } catch {
    return NextResponse.json({ quotes: FALLBACK_QUOTES });
  }
}
