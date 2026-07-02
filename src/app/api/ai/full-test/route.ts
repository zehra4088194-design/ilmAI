import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat, type AiProviderId, type ModelTier } from '@/lib/ai/gateway';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export interface FullTestPaper {
  title: string;
  totalMarks: number | null;
  timeAllowed: number;
  mcqs: { q: string; opts: string[]; correct: number; exp: string }[];
  shortQs: { q: string; marks: number; keyPoints: string[] }[];
  longQs: { q: string; marks: number; keyPoints: string[]; guide: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limitCheck = await checkAiMessageLimit(user.id, tier);
    if (!limitCheck.success) return NextResponse.json({ status: 'error', error: 'Daily AI limit khatam ho gayi' }, { status: 429 });

    const { subjectName, chapterName, className, boardName, mcqCount = 15, shortCount = 6, longCount = 3, provider = 'groq', aiTier = 'medium' } = await req.json();

    const BOARD_PATTERNS: Record<string, { totalMarks: number; time: number }> = {
      '9': { totalMarks: 75, time: 180 }, '10': { totalMarks: 75, time: 180 },
      '11': { totalMarks: 100, time: 195 }, '12': { totalMarks: 100, time: 195 },
    };
    const classNum = className?.replace(/\D/g, '') || '10';
    const pattern = BOARD_PATTERNS[classNum] || BOARD_PATTERNS['10'];

    const prompt = `Generate a complete exam paper for Pakistan board exam:
Subject: ${subjectName}
Class: ${className}
Board: ${boardName}
Chapter/Topics: ${chapterName}

EXACT count required:
- ${mcqCount} MCQs (each has 4 options, 1 correct)
- ${shortCount} Short Questions (2-5 marks each)
- ${longCount} Long Questions (5-10 marks each)

Return ONLY valid JSON, no markdown, no extra text:
{
  "title":"${subjectName} — ${className} — ${boardName}",
  "totalMarks":${pattern.totalMarks},
  "timeAllowed":${pattern.time},
  "mcqs":[{"q":"question text","opts":["Option A","Option B","Option C","Option D"],"correct":0,"exp":"why correct"}],
  "shortQs":[{"q":"question","marks":3,"keyPoints":["key point 1","key point 2","key point 3"]}],
  "longQs":[{"q":"question","marks":8,"keyPoints":["point 1","point 2","point 3","point 4","point 5"],"guide":"~200 words expected"}]
}`;

    const result = await gatewayChat({
      provider: provider as AiProviderId,
      tier: aiTier as ModelTier,
      messages: [
        { role: 'system', content: 'You are an expert Pakistani board exam paper setter. Return only valid JSON, no markdown fences, no extra text.' },
        { role: 'user', content: prompt },
      ],
      maxTokens: 4096,
      temperature: 0.3,
    });

    const parsed = parseAiJson<FullTestPaper>(result.text, {
      title: `${subjectName} Paper`,
      totalMarks: pattern.totalMarks,
      timeAllowed: pattern.time,
      mcqs: [], shortQs: [], longQs: [],
    });

    return NextResponse.json({ status: 'success', data: parsed, providerUsed: result.providerUsed });
  } catch (error) {
    console.error('Full test error:', error);
    return NextResponse.json({ status: 'error', error: 'Test paper generate nahi hua. Dobara try karo.' }, { status: 500 });
  }
}
