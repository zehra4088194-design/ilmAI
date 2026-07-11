import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat, GatewayError, MARKDOWN_ANSWER_FORMAT_INSTRUCTION } from '@/lib/ai/gateway';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const userTier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limit = await checkAiMessageLimit(user.id, userTier, 'humanizer');

    if (!limit.success) {
      return NextResponse.json(
        { status: 'error', error: userTier === 'FREE' ? 'Aaj ke AI messages khatam ho gaye. Pro plan lo zyada messages ke liye!' : 'Aaj ki limit khatam ho gayi. Kal phir try karo.' },
        { status: 429 }
      );
    }

    const { text, tone = 'natural', language = 'English', preserveMeaning = true } = await req.json();
    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return NextResponse.json({ status: 'error', error: 'Humanize karne ke liye thora text paste karo.' }, { status: 400 });
    }

    const result = await gatewayChat({
      provider: 'groq',
      tier: 'medium',
      maxTokens: 2048,
      temperature: 0.65,
      messages: [
        {
          role: 'system',
          content: `You are ilm AI's writing humanizer. Rewrite AI-like text so it sounds natural, clear, and student-written without changing the meaning.
Rules:
- Do not add fake citations, fake facts, or unverifiable claims
- Keep the same core meaning and key details
- Improve flow, sentence variety, and readability
- Avoid plagiarism support; present it as a study draft the student must review and personalize
- Output only the improved text, no preface

${MARKDOWN_ANSWER_FORMAT_INSTRUCTION}`,
        },
        {
          role: 'user',
          content: `Language: ${language}
Tone: ${tone}
Preserve meaning: ${preserveMeaning ? 'yes' : 'lightly improve clarity if needed'}

Text:
${text}`,
        },
      ],
    });

    return NextResponse.json({ status: 'success', data: { text: result.text } });
  } catch (error) {
    console.error('AI humanizer error:', error);
    if (error instanceof GatewayError) {
      return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
    }
    return NextResponse.json({ status: 'error', error: 'Humanized text generate nahi ho saka.' }, { status: 500 });
  }
}
