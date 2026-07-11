import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 20;

const FALLBACK_QUOTES = [
  'Aaj ka ek solved question kal ke confidence ka seed hai.',
  'Topic mushkil hai to bas pehla example solve karo, momentum khud banega.',
  'Smart study ka matlab hai: samjho, recall karo, phir test karo.',
  'Tum jitni baar revise karte ho, utni baar anxiety kam hoti hai.',
  'Slow progress bhi progress hai, bas streak break mat hone do.',
  'Concept clear ho jaye to marks naturally follow karte hain.',
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
        { role: 'user', content: `Generate 8 warm, fresh, non-cringey motivational quotes in simple English + Roman Urdu mix${subject ? ` for ${subject}` : ''}. Each quote under 18 words.` },
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
