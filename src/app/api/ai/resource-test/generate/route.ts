import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import { fetchResourceContext, getProtectedResource, type ProtectedResourceKind } from '@/lib/resources/server';
import type { FullTestPaper } from '@/app/api/ai/full-test/route';

export const runtime = 'nodejs';
export const maxDuration = 60;

function count(value: unknown, max: number) {
  return Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai.' }, { status: 401 });
    const body = await req.json();
    const kind = body.kind as ProtectedResourceKind;
    if ((kind !== 'library' && kind !== 'past-paper' && kind !== 'college-resource') || typeof body.id !== 'string') {
      return NextResponse.json({ status: 'error', error: 'Invalid resource.' }, { status: 400 });
    }
    const resource = await getProtectedResource(user.id, kind, body.id, 'light');
    if (!resource) return NextResponse.json({ status: 'error', error: 'Resource nahi mila.' }, { status: 404 });
    if (resource.tier === 'FREE') {
      return NextResponse.json(
        { status: 'error', error: 'File se test Pro/Elite mein unlock hota hai.' },
        { status: 403 }
      );
    }
    const mcqCount = count(body.counts?.mcq, 30);
    const shortCount = count(body.counts?.short, 15);
    const longCount = count(body.counts?.long, 8);
    if (mcqCount + shortCount + longCount === 0) {
      return NextResponse.json({ status: 'error', error: 'Kam az kam ek question select karo.' }, { status: 400 });
    }
    const limit = await checkAiMessageLimit(user.id, resource.tier, 'resource_test_generate');
    if (!limit.success) {
      return NextResponse.json({ status: 'error', error: 'Aaj ki AI limit khatam ho gayi.' }, { status: 429 });
    }
    const context = await fetchResourceContext(resource);
    const result = await gatewayChat({
      provider: 'gemini',
      tier: 'medium',
      strictProvider: true,
      maxTokens: 8192,
      temperature: 0.25,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert exam setter. Use only the supplied source text. Return valid JSON only, with no markdown fences.',
        },
        {
          role: 'user',
          content: `Create a test strictly from this resource.\nExact counts: ${mcqCount} MCQs, ${shortCount} short questions, ${longCount} long questions.\nEvery MCQ needs four options, a zero-based correct option index, and a concise explanation. Written questions need marks and source-grounded key points.\n\nReturn exactly:\n{"title":"...","totalMarks":number,"timeAllowed":number,"mcqs":[{"q":"...","opts":["A","B","C","D"],"correct":0,"exp":"..."}],"shortQs":[{"q":"...","marks":3,"keyPoints":["..."]}],"longQs":[{"q":"...","marks":8,"keyPoints":["..."],"guide":"..."}]}\n\nRESOURCE: ${resource.title}\n\nSOURCE TEXT:\n${context}`,
        },
      ],
    });
    const fallback: FullTestPaper = {
      title: `${resource.title} - AI Test`,
      totalMarks: mcqCount + shortCount * 3 + longCount * 8,
      timeAllowed: Math.max(15, mcqCount + shortCount * 5 + longCount * 12),
      mcqs: [],
      shortQs: [],
      longQs: [],
    };
    const paper = parseAiJson<FullTestPaper>(result.text, fallback);
    paper.mcqs = (paper.mcqs || []).slice(0, mcqCount);
    paper.shortQs = (paper.shortQs || []).slice(0, shortCount);
    paper.longQs = (paper.longQs || []).slice(0, longCount);
    if (paper.mcqs.length + paper.shortQs.length + paper.longQs.length === 0) {
      throw new Error('Gemini ne valid test JSON return nahi kiya. Dobara try karo.');
    }
    return NextResponse.json({
      status: 'success',
      data: { paper, resourceTitle: resource.title },
      provider: result.providerUsed,
    });
  } catch (error) {
    console.error('Gemini resource test generation failed:', error);
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Test generate nahi hua.' },
      { status: 500 }
    );
  }
}
