import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { summarizeWithRoutedModel } from '@/lib/ai/summary-router';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    if (tier === 'FREE') {
      return NextResponse.json({ status: 'error', error: 'AI Summary is available on Pro.' }, { status: 403 });
    }
    const limitCheck = await checkAiMessageLimit(user.id, tier, 'summarize');
    if (!limitCheck.success) return NextResponse.json({ status: 'error', error: 'The daily AI limit has been reached.' }, { status: 429 });

    const { text } = await req.json();
    if (!text || text.length < 50) return NextResponse.json({ status: 'error', error: 'Kam se kam 50 characters ka text do' }, { status: 400 });

    const result = await summarizeWithRoutedModel({
      text,
      system: 'Summarize Pakistani board exam content concisely with key points highlighted.',
      prompt: (content) => `Summarize this in bullet points:\n\n${content}`,
      maxTokens: text.length > 6000 ? 1800 : 1024,
      temperature: 0.3,
    });

    return NextResponse.json({ status: 'success', data: { summary: result.text, provider: result.provider, routeReason: result.routeReason } });
  } catch (error) {
    console.error('Summarize API error:', error);
    return NextResponse.json({ status: 'error', error: 'The summary could not be generated.' }, { status: 500 });
  }
}
