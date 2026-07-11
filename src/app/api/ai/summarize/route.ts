import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
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
    const limitCheck = await checkAiMessageLimit(user.id, tier, 'summarize');
    if (!limitCheck.success) return NextResponse.json({ status: 'error', error: 'Daily AI limit khatam ho gayi' }, { status: 429 });

    const { text } = await req.json();
    if (!text || text.length < 50) return NextResponse.json({ status: 'error', error: 'Kam se kam 50 characters ka text do' }, { status: 400 });

    const result = await gatewayChat({
      provider: 'groq', tier: 'mini',
      messages: [
        { role: 'system', content: 'Summarize Pakistani board exam content concisely with key points highlighted.' },
        { role: 'user', content: `Summarize this in bullet points:\n\n${text.slice(0, 6000)}` },
      ],
      maxTokens: 1024, temperature: 0.3,
    });

    return NextResponse.json({ status: 'success', data: { summary: result.text } });
  } catch (error) {
    console.error('Summarize API error:', error);
    return NextResponse.json({ status: 'error', error: 'Summary generate nahi ho saka' }, { status: 500 });
  }
}
