import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limitCheck = await checkAiMessageLimit(user.id, tier);
    if (!limitCheck.success) return NextResponse.json({ status: 'error', error: 'Daily AI limit khatam ho gayi' }, { status: 429 });

    const { topic, wordCount, essayType, language, provider, aiTier } = await req.json();
    if (!topic) return NextResponse.json({ status: 'error', error: 'Essay topic zaroori hai' }, { status: 400 });

    const useProvider: AiProviderId = provider || 'groq';
    const useTier: ModelTier = aiTier || 'mini';
    const targetWords = wordCount || 300;
    const type = essayType || 'general';
    const lang = language === 'urdu' ? 'Roman Urdu mixed with simple English' : 'clear English';

    const result = await gatewayChat({
      provider: useProvider,
      tier: useTier,
      messages: [
        {
          role: 'system',
          content: `You are an expert essay-writing tutor for Pakistani board-exam students (grades 9-12). Write well-structured Markdown essays with a clear ## Introduction, body sections with ## or ### headings where natural, and a ## Conclusion. Bold key terms and use short paragraphs. Never return a flat wall of text.`,
        },
        {
          role: 'user',
          content: `Write a ${type} essay on the topic: "${topic}". Target length: approximately ${targetWords} words. Write in ${lang}. Structure it clearly with Markdown headings for Introduction, body sections, and Conclusion.`,
        },
      ],
      maxTokens: Math.min(4000, targetWords * 8),
      temperature: 0.7,
    });

    return NextResponse.json({ status: 'success', data: { essay: result.text } });
  } catch (error) {
    console.error('Essay writer error:', error);
    return NextResponse.json({ status: 'error', error: 'Essay generate nahi hui' }, { status: 500 });
  }
}
