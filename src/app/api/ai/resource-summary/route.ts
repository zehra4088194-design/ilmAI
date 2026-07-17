import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat, MARKDOWN_ANSWER_FORMAT_INSTRUCTION } from '@/lib/ai/gateway';
import { checkAiMessageLimit } from '@/lib/rate-limit';
import { fetchResourceContext, getProtectedResource, type ProtectedResourceKind } from '@/lib/resources/server';
import { buildResourceSourceSummary } from '@/lib/resources/source-fallback';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
        { status: 'error', error: 'AI Summary Pro/Elite mein unlock hoti hai.' },
        { status: 403 }
      );
    }
    const context = await fetchResourceContext(resource);
    const limit = await checkAiMessageLimit(user.id, resource.tier as SubscriptionTier, 'resource_summary');
    if (!limit.success) {
      return NextResponse.json({ status: 'error', error: 'Aaj ki AI limit khatam ho gayi.' }, { status: 429 });
    }

    let summary: string;
    let provider = 'source-fallback';
    let model = 'deterministic-source-parser';
    let fallbackUsed = false;
    try {
      const result = await gatewayChat({
        provider: 'gemini',
        tier: 'medium',
        maxTokens: 1800,
        temperature: 0.25,
        messages: [
          {
            role: 'system',
            content: `You summarize only the supplied educational source. Never add facts not present in it. ${MARKDOWN_ANSWER_FORMAT_INSTRUCTION}`,
          },
          {
            role: 'user',
            content: `Resource: ${resource.title}\n\nCreate a student-friendly summary from this companion text file. Include:\n1. What this file covers\n2. Key concepts/formulas\n3. Important exam points\n4. A compact revision checklist\n\nSOURCE TEXT:\n${context}`,
          },
        ],
      });
      summary = result.text;
      provider = result.providerUsed;
      model = result.modelUsed;
    } catch (gatewayError) {
      fallbackUsed = true;
      console.warn('AI summary gateway unavailable; using source fallback:', gatewayError);
      summary = buildResourceSourceSummary(resource.title, context);
    }

    return NextResponse.json({
      status: 'success',
      data: { summary, provider, model, fallbackUsed },
    });
  } catch (error) {
    console.error('Resource summary failed:', error);
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Summary generate nahi hui.' },
      { status: 500 }
    );
  }
}
