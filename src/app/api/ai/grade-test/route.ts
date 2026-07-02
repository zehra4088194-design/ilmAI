import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limitCheck = await checkAiMessageLimit(user.id, tier);
    if (!limitCheck.success) return NextResponse.json({ status: 'error', error: 'Daily AI limit khatam ho gayi' }, { status: 429 });

    const { questions, answers, subjectName, className } = await req.json();
    const evals: { score: number; grade: string; feedback: string }[] = [];

    for (const qa of questions) {
      const userAns = answers[qa.id] || '(No answer provided)';
      const result = await gatewayChat({
        provider: 'groq', tier: 'mini',
        messages: [
          { role: 'system', content: 'You are a Pakistani board exam evaluator. Grade fairly and return only valid JSON.' },
          { role: 'user', content: `Evaluate: Class ${className} ${subjectName}. Q: ${qa.q}. KeyPoints: ${qa.keyPoints?.join('; ')}. Marks: ${qa.marks}. Answer: "${userAns}". Return ONLY JSON: {"score":${qa.marks},"grade":"A","feedback":"brief feedback in Roman Urdu or English"}` },
        ],
        maxTokens: 300, temperature: 0.2,
      });
      const ev = parseAiJson(result.text, { score: 0, grade: '?', feedback: 'Evaluation pending' });
      evals.push(ev);
    }

    return NextResponse.json({ status: 'success', data: evals });
  } catch (error) {
    console.error('Grade test error:', error);
    return NextResponse.json({ status: 'error', error: 'Grading fail ho gai' }, { status: 500 });
  }
}
