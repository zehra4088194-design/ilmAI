import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat, type AiProviderId, type ModelTier } from '@/lib/ai/gateway';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export interface GuessPaperResult {
  hotTopics: string[];
  mcqs: { q: string; opts: string[]; likelihood: 'high' | 'medium'; }[];
  shortQuestions: { q: string; marks: number; likelihood: 'high' | 'medium'; }[];
  longQuestions: { q: string; marks: number; likelihood: 'high' | 'medium'; }[];
  examTips: string[];
  disclaimer: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';

    const limitCheck = await checkAiMessageLimit(user.id, tier, 'guess_paper');
    if (!limitCheck.success) {
      return NextResponse.json({ status: 'error', error: 'The daily AI limit has been reached. Try again tomorrow or upgrade to Pro.' }, { status: 429 });
    }

    const { subjectId, chapterIds = [], board = 'FBISE', gradeLevel = 'GRADE_10', provider = 'groq', aiTier = 'mini' } = await req.json();
    if (!subjectId) return NextResponse.json({ status: 'error', error: 'A subject is required' }, { status: 400 });

    // Get chapter names for context
    let chapterContext = 'All chapters';
    if (chapterIds.length > 0) {
      const { data: chapters } = await supabase.from('chapters').select('name').in('id', chapterIds).limit(10);
      chapterContext = chapters?.map(c => c.name).join(', ') || 'Selected chapters';
    }
    const { data: subject } = await supabase.from('subjects').select('name').eq('id', subjectId).single();
    const subjectName = subject?.name || 'Subject';

    const prompt = `You are an expert Pakistani board exam analyst. Based on historical patterns and curriculum importance, generate a realistic guess paper for:
Subject: ${subjectName}
Board: ${board}
Grade: ${gradeLevel}
Chapters/Topics: ${chapterContext}

Return ONLY valid JSON, no markdown, no extra text:
{
  "hotTopics": ["topic likely to appear (5-6 items)"],
  "mcqs": [{"q":"question text","opts":["A","B","C","D"],"likelihood":"high"}],
  "shortQuestions": [{"q":"question","marks":2,"likelihood":"high"}],
  "longQuestions": [{"q":"question","marks":5,"likelihood":"high"}],
  "examTips": ["board-specific tip (3-4 items)"],
  "disclaimer": "These are AI-generated predictions; the actual paper may differ."
}
Include: 8 MCQs, 5 short questions, 3 long questions. Mark each as high or medium likelihood.`;

    const result = await gatewayChat({
      provider: (provider as AiProviderId),
      tier: (aiTier as ModelTier),
      messages: [
        { role: 'system', content: 'You are an expert Pakistani board exam question predictor. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      maxTokens: 2048,
      temperature: 0.4,
    });

    const parsed = parseAiJson<GuessPaperResult>(result.text, {
      hotTopics: [], mcqs: [], shortQuestions: [], longQuestions: [], examTips: [],
      disclaimer: 'These are AI-generated predictions; the actual paper may differ.',
    });

    return NextResponse.json({ status: 'success', data: parsed, providerUsed: result.providerUsed });
  } catch (error) {
    console.error('Guess paper error:', error);
    return NextResponse.json({ status: 'error', error: 'The guess paper could not be generated. Please try again.' }, { status: 500 });
  }
}
