import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat, MARKDOWN_ANSWER_FORMAT_INSTRUCTION } from '@/lib/ai/gateway';
import { checkAiMessageLimit, checkFileSummaryLimit } from '@/lib/rate-limit';
import { fetchResourceContext, getProtectedResource, type ProtectedResourceKind } from '@/lib/resources/server';
import { buildResourceEvidence, buildResourceEvidenceFromChunk, verifiedSourceInstruction } from '@/lib/resources/evidence';
import { buildResourceSourceSummary } from '@/lib/resources/source-fallback';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required.' }, { status: 401 });

    const { kind, id } = await req.json();
    if ((kind !== 'library' && kind !== 'past-paper' && kind !== 'college-resource') || typeof id !== 'string') {
      return NextResponse.json({ status: 'error', error: 'Invalid resource.' }, { status: 400 });
    }
    const resource = await getProtectedResource(user.id, kind as ProtectedResourceKind, id, 'light');
    if (!resource) return NextResponse.json({ status: 'error', error: 'The resource was not found.' }, { status: 404 });
    if (resource.tier === 'FREE') {
      return NextResponse.json(
        { status: 'error', error: 'AI Summary is available on Pro and Elite.' },
        { status: 403 }
      );
    }
    const featureLimit = await checkFileSummaryLimit(user.id, resource.tier as SubscriptionTier);
    if (!featureLimit.success) {
      return NextResponse.json(
        { status: 'error', error: 'The monthly file-summary limit has been reached.' },
        { status: 429 }
      );
    }
    const limit = await checkAiMessageLimit(user.id, resource.tier as SubscriptionTier, 'resource_summary');
    if (!limit.success) {
      return NextResponse.json({ status: 'error', error: "Today's AI limit has been reached." }, { status: 429 });
    }
    const context = await fetchResourceContext(resource);

    let summary: string;
    let provider = 'source-fallback';
    let model = 'deterministic-source-parser';
    let fallbackUsed = false;
    try {
      const result = await gatewayChat({
        provider: 'groq',
        tier: 'mini',
        maxTokens: 1800,
        temperature: 0.25,
        messages: [
          {
            role: 'system',
            content: `${verifiedSourceInstruction()} ${MARKDOWN_ANSWER_FORMAT_INSTRUCTION}`,
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
      console.warn('Groq summary gateway unavailable; using source fallback:', gatewayError);
      summary = buildResourceSourceSummary(resource.title, context);
    }

    const { data: evidenceChunk } = await (supabase as any)
      .from('resource_source_chunks')
      .select('content, page_number, metadata')
      .eq('resource_kind', resource.kind)
      .eq('resource_id', resource.id)
      .order('chunk_index', { ascending: true })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      status: 'success',
      data: {
        summary,
        provider,
        model,
        fallbackUsed,
        source: evidenceChunk
          ? buildResourceEvidenceFromChunk(resource.title, evidenceChunk as any, fallbackUsed ? 100 : 92)
          : buildResourceEvidence(resource.title, context, fallbackUsed ? 100 : 88),
      },
    });
  } catch (error) {
    console.error('Resource summary failed:', error);
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'The summary could not be generated.' },
      { status: 500 }
    );
  }
}
