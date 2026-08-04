import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit, consumeAiCredits } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limitCheck = await checkAiMessageLimit(user.id, tier, 'grade_answer');
    if (!limitCheck.success)
      return NextResponse.json({ status: 'error', error: 'The daily AI limit has been reached.' }, { status: 429 });

    const { question, studentAnswer, modelAnswer, marks } = await req.json();
    if (!question || !studentAnswer)
      return NextResponse.json({ status: 'error', error: 'A question and answer are required' }, { status: 400 });

    const messages = [
      {
        role: 'system' as const,
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
      {
        role: 'user' as const,
        content: `Question (${marks || 5} marks): ${question}\n\nModel Answer: ${modelAnswer || 'N/A'}\n\nStudent Answer: ${studentAnswer}\n\nGrade this answer.`,
      },
    ];
    let result;
    let parsed: { score: number; maxScore: number; feedback: string; improvements: string[] } | null = null;
    for (const provider of ['groq', 'deepseek'] as const) {
      try {
        result = await gatewayChat({
          provider,
          tier: 'mini',
          messages,
          maxTokens: 1024,
          temperature: 0.2,
          strictProvider: true,
          routingPolicy: 'grading',
        });
        const candidate = JSON.parse(result.text.replace(/```json|```/g, '').trim());
        if (!Number.isFinite(Number(candidate.score)) || typeof candidate.feedback !== 'string') {
          throw new Error('Invalid grading response.');
        }
        parsed = {
          score: Math.max(0, Math.min(Number(candidate.score), Number(marks) || 5)),
          maxScore: Number(marks) || 5,
          feedback: candidate.feedback,
          improvements: Array.isArray(candidate.improvements) ? candidate.improvements.map(String).slice(0, 8) : [],
        };
        break;
      } catch (gradingError) {
        console.warn(`${provider} answer grading failed:`, gradingError);
      }
    }
    if (!parsed) throw new Error('Both grading providers returned an invalid response.');

    await consumeAiCredits(user.id, tier, 'grade_answer');
    return NextResponse.json({ status: 'success', data: parsed, provider: result?.providerUsed });
  } catch (error) {
    console.error('Grade answer API error:', error);
    return NextResponse.json({ status: 'error', error: 'Grading failed' }, { status: 500 });
  }
}
