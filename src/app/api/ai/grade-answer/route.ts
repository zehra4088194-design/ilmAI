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
    const limitCheck = await checkAiMessageLimit(user.id, tier);
    if (!limitCheck.success) return NextResponse.json({ status: 'error', error: 'Daily AI limit khatam ho gayi' }, { status: 429 });

    const { question, studentAnswer, modelAnswer, marks } = await req.json();
    if (!question || !studentAnswer) return NextResponse.json({ status: 'error', error: 'Question aur answer required hain' }, { status: 400 });

    const result = await gatewayChat({
      provider: 'groq', tier: 'mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert examiner for Pakistani board exams. Grade fairly based on the marking scheme.
Return ONLY valid JSON (no markdown fences) with this exact shape:
{"score": number, "maxScore": number, "feedback": string, "improvements": string[]}

The "feedback" string should itself be a short well-structured Markdown document:
- A one-line "### " summary of how the student did
- **Bold** the marks awarded and the key concept
- A short numbered list of what was missing or could be improved, if anything
- Use LaTeX ($...$) for any formula referenced
Each "improvements" array item should be one concise sentence (plain text, no markdown needed there).`,
        },
        { role: 'user', content: `Question (${marks || 5} marks): ${question}\n\nModel Answer: ${modelAnswer || 'N/A'}\n\nStudent Answer: ${studentAnswer}\n\nGrade this answer.` },
      ],
      maxTokens: 1024, temperature: 0.2,
    });

    const cleaned = result.text.replace(/```json|```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleaned); } catch { parsed = { score: 0, maxScore: marks || 5, feedback: result.text, improvements: [] }; }

    return NextResponse.json({ status: 'success', data: parsed });
  } catch (error) {
    console.error('Grade answer API error:', error);
    return NextResponse.json({ status: 'error', error: 'Grading fail ho gayi' }, { status: 500 });
  }
}
