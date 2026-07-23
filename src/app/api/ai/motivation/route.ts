import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
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
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json?.quotes)) return json.quotes.filter((q: unknown) => typeof q === 'string');
  } catch {}
  return text
    .split('\n')
    .map((line) => line.replace(/^[-*\d.\s"']+|["']+$/g, '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ quotes: FALLBACK_QUOTES });

  const { subject } = await req.json().catch(() => ({}));
  try {
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limit = await checkAiMessageLimit(user.id, tier, 'motivation');
    if (!limit.success) return NextResponse.json({ status: 'error', error: await getConfiguredLimitExceededMessage(tier, 'Motivation AI') }, { status: 429 });

    const result = await gatewayChat({
      provider: 'groq',
      tier: 'mini',
      messages: [
        { role: 'system', content: 'You write short motivational study quotes for Pakistani students. Return only JSON: {"quotes":["..."]}. No markdown.' },
        { role: 'user', content: `Generate 8 warm, fresh, non-cringey motivational quotes in professional, student-friendly English${subject ? ` for ${subject}` : ''}. Keep each quote under 18 words.` },
      ],
      maxTokens: 500,
      temperature: 0.9,
    });
    const quotes = parseQuotes(result.text);
    return NextResponse.json({ quotes: quotes.length ? quotes : FALLBACK_QUOTES });
  } catch {
    return NextResponse.json({ quotes: FALLBACK_QUOTES });
  }
}
