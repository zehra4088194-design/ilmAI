import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit, consumeAiCredits } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limitCheck = await checkAiMessageLimit(user.id, tier, 'grade_test');
    if (!limitCheck.success)
      return NextResponse.json({ status: 'error', error: 'The daily AI limit has been reached.' }, { status: 429 });

    const { questions, answers, subjectName, className } = await req.json();
    const evals: { score: number; grade: string; feedback: string }[] = [];

    for (const qa of questions) {
      const userAns = answers[qa.id] || '(No answer provided)';
      const maxMarks = Number(qa.marks) || 0;
      const messages = [
        {
          role: 'system' as const,
          content: `You are a Pakistani board exam evaluator. Grade fairly and return only valid JSON, no markdown fences around the JSON itself.
Return: {"score": number, "grade": string, "feedback": string}
The score can never exceed the question's marks. Clamp it between 0 and the max marks.
The "feedback" value should be a short Markdown-formatted mini-document: a one-line "### " verdict, then 1-2 short bullet points on what was good/missing, with **bold** on the key concept. Use LaTeX ($...$) if a formula is relevant. Keep it to 3-4 sentences total worth of content.`,
        },
        {
          role: 'user' as const,
          content: `Evaluate: Class ${className} ${subjectName}. Q: ${qa.q}. KeyPoints: ${qa.keyPoints?.join('; ')}. Marks: ${maxMarks}. Answer: "${userAns}". Return ONLY JSON with score as a number from 0 to ${maxMarks}.`,
        },
      ];
      let ev: { score: number; grade: string; feedback: string } | null = null;
      for (const provider of ['gemini', 'deepseek'] as const) {
        try {
          const result = await gatewayChat({
            provider,
            tier: 'mini',
            messages,
            maxTokens: 500,
            temperature: 0.2,
            strictProvider: true,
            routingPolicy: 'grading',
          });
          const candidate = parseAiJson<Partial<{ score: number; grade: string; feedback: string }>>(result.text, {});
          if (!Number.isFinite(Number(candidate.score)) || typeof candidate.feedback !== 'string') {
            throw new Error('Invalid grading response.');
          }
          ev = {
            score: Number(candidate.score),
            grade: String(candidate.grade || '?'),
            feedback: candidate.feedback,
          };
          break;
        } catch (gradingError) {
          console.warn(`${provider} test grading failed:`, gradingError);
        }
      }
      if (!ev) throw new Error('All grading providers returned an invalid response.');
      ev.score = Math.max(0, Math.min(Number(ev.score) || 0, maxMarks));
      evals.push(ev);
    }

    await consumeAiCredits(user.id, tier, 'grade_test');
    return NextResponse.json({ status: 'success', data: evals });
  } catch (error) {
    console.error('Grade test error:', error);
    return NextResponse.json({ status: 'error', error: 'Grading failed' }, { status: 500 });
  }
}
