import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit, consumeAiCredits } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import { fetchResourceContext, getProtectedResource, type ProtectedResourceKind } from '@/lib/resources/server';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import { analyzeResourceSource, type ResourceAnalysis } from '@/lib/resources/source-fallback';
import { buildRepresentativeTextContext } from '@/lib/resources/context-window';
import { createArtifactKey, readAiArtifact, writeAiArtifact } from '@/lib/ai/artifact-cache';
import { buildHybridResourceContext } from '@/lib/resources/semantic-context';

export const runtime = 'nodejs';
export const maxDuration = 180;

type Analysis = ResourceAnalysis;

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
        { status: 'error', error: 'File-based tests are available on Pro and Elite.' },
        { status: 403 }
      );
    }
    const context = await fetchResourceContext(resource);
    const artifactKey = createArtifactKey('resource-analysis', { prompt: 3, kind, id, title: resource.title, context });
    const cached = await readAiArtifact<{ parsed: Analysis; provider: string; fallbackUsed: boolean }>(artifactKey);
    if (cached) {
      return NextResponse.json({
        status: 'success',
        data: cached.parsed,
        provider: cached.provider,
        fallbackUsed: cached.fallbackUsed,
        cached: true,
      });
    }
    const modelContext = await buildHybridResourceContext({
      resourceKey: `${kind}:${id}`,
      source: context,
      query: 'document structure topics concepts formulas examples and available exam question material',
    }).catch(() => buildRepresentativeTextContext(context));
    const limit = await checkAiMessageLimit(user.id, resource.tier, 'resource_test_analyze');
    if (!limit.success) {
      return NextResponse.json({ status: 'error', error: "Today's AI limit has been reached." }, { status: 429 });
    }
    let parsed: Analysis;
    let provider = 'source-fallback';
    let fallbackUsed = false;
    try {
      const adminProvider = await resolveAiRoutingProvider('resourceTest');
      const result = await gatewayChat({
        provider: adminProvider,
        strictProvider: true,
        routingPolicy: 'text',
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
            content: `Analyze this educational file before another model creates a test. Identify the content type, main topics, whether MCQs/short/long questions can sensibly be generated, and safe recommended maximum counts based on how much source material exists.\n\nReturn exactly:\n{"documentType":"notes|book|past_paper|mixed","topics":["..."],"detectedSections":["concepts","formulas","worked examples","existing mcqs","short questions","long questions"],"available":{"mcq":0-30,"short":0-15,"long":0-8}}\n\nRESOURCE: ${resource.title}\n\nSOURCE TEXT (representative sections from the attached TXT):\n${modelContext}`,
          },
        ],
      });
      parsed = parseAiJson<Analysis>(result.text, analyzeResourceSource(context));
      provider = result.providerUsed;
    } catch (gatewayError) {
      fallbackUsed = true;
      console.warn('DeepSeek analysis model unavailable; using source fallback:', gatewayError);
      parsed = analyzeResourceSource(context);
    }
    parsed.available = {
      mcq: Math.max(0, Math.min(30, Number(parsed.available?.mcq) || 0)),
      short: Math.max(0, Math.min(15, Number(parsed.available?.short) || 0)),
      long: Math.max(0, Math.min(8, Number(parsed.available?.long) || 0)),
    };
    // A resource whose declared content is strictly MCQ (content_section
    // 'mcq') must stay MCQ-only here — the AI analyzer above judges purely
    // from the text and will happily claim short/long "could" be generated
    // from an MCQ file's content, which is exactly the "test from this
    // file" showing short/long sliders for an MCQ-only file. The reverse
    // isn't restricted: a short/long file legitimately CAN offer AI-
    // generated MCQs alongside its own questions.
    if (resource.contentSection === 'mcq') {
      parsed.available.short = 0;
      parsed.available.long = 0;
    }
    await writeAiArtifact(artifactKey, { parsed, provider, fallbackUsed });
    await consumeAiCredits(user.id, resource.tier, 'resource_test_analyze');
    return NextResponse.json({ status: 'success', data: parsed, provider, fallbackUsed, cached: false });
  } catch (error) {
    console.error('Grok resource analysis failed:', error);
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'The document could not be analyzed.' },
      { status: 500 }
    );
  }
}
