import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import { fetchResourceContext, getProtectedResource, type ProtectedResourceKind } from '@/lib/resources/server';
import { analyzeResourceSource, type ResourceAnalysis } from '@/lib/resources/source-fallback';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Analysis = ResourceAnalysis;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai.' }, { status: 401 });
    const { kind, id } = await req.json();
    if ((kind !== 'library' && kind !== 'past-paper' && kind !== 'college-resource') || typeof id !== 'string') {
      return NextResponse.json({ status: 'error', error: 'Invalid resource.' }, { status: 400 });
    }
    const resource = await getProtectedResource(user.id, kind as ProtectedResourceKind, id, 'light');
    if (!resource) return NextResponse.json({ status: 'error', error: 'Resource nahi mila.' }, { status: 404 });
    if (resource.tier === 'FREE') {
      return NextResponse.json(
        { status: 'error', error: 'File se test Pro/Elite mein unlock hota hai.' },
        { status: 403 }
      );
    }
    const context = await fetchResourceContext(resource);
    const limit = await checkAiMessageLimit(user.id, resource.tier, 'resource_test_analyze');
    if (!limit.success) {
      return NextResponse.json({ status: 'error', error: 'Aaj ki AI limit khatam ho gayi.' }, { status: 429 });
    }
    let parsed: Analysis;
    let provider = 'source-fallback';
    let fallbackUsed = false;
    try {
      const result = await gatewayChat({
        provider: 'grok',
        tier: 'mini',
        maxTokens: 900,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content:
              'You are a document analyst. Inspect only the supplied source and return valid JSON with no markdown.',
          },
          {
            role: 'user',
            content: `Analyze this educational file before another model creates a test. Identify the content type, main topics, whether MCQs/short/long questions can sensibly be generated, and safe recommended maximum counts based on how much source material exists.\n\nReturn exactly:\n{"documentType":"notes|book|past_paper|mixed","topics":["..."],"detectedSections":["concepts","formulas","worked examples","existing mcqs","short questions","long questions"],"available":{"mcq":0-30,"short":0-15,"long":0-8}}\n\nRESOURCE: ${resource.title}\n\nSOURCE TEXT:\n${context}`,
          },
        ],
      });
      parsed = parseAiJson<Analysis>(result.text, analyzeResourceSource(context));
      provider = result.providerUsed;
    } catch (gatewayError) {
      fallbackUsed = true;
      console.warn('Grok analysis unavailable; using source fallback:', gatewayError);
      parsed = analyzeResourceSource(context);
    }
    parsed.available = {
      mcq: Math.max(0, Math.min(30, Number(parsed.available?.mcq) || 0)),
      short: Math.max(0, Math.min(15, Number(parsed.available?.short) || 0)),
      long: Math.max(0, Math.min(8, Number(parsed.available?.long) || 0)),
    };
    return NextResponse.json({ status: 'success', data: parsed, provider, fallbackUsed });
  } catch (error) {
    console.error('Grok resource analysis failed:', error);
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Grok file analyze nahi kar saka.' },
      { status: 500 }
    );
  }
}
