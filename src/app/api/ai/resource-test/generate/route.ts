import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit, checkFileTestLimit, consumeAiCredits } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import { fetchResourceContext, getProtectedResource, type ProtectedResourceKind } from '@/lib/resources/server';
import { buildResourceEvidence, verifiedSourceInstruction } from '@/lib/resources/evidence';
import type { FullTestPaper } from '@/app/api/ai/full-test/route';
import { buildResourceSourceTest, filterHighQualitySourceMcqs } from '@/lib/resources/source-fallback';
import { buildRepresentativeTextContext } from '@/lib/resources/context-window';
import { createArtifactKey, readAiArtifact, writeAiArtifact } from '@/lib/ai/artifact-cache';
import { buildHybridResourceContext } from '@/lib/resources/semantic-context';

export const runtime = 'nodejs';
export const maxDuration = 180;

function count(value: unknown, max: number) {
  return Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required.' }, { status: 401 });
    const body = await req.json();
    const kind = body.kind as ProtectedResourceKind;
    if ((kind !== 'library' && kind !== 'past-paper' && kind !== 'college-resource') || typeof body.id !== 'string') {
      return NextResponse.json({ status: 'error', error: 'Invalid resource.' }, { status: 400 });
    }
    const resource = await getProtectedResource(user.id, kind, body.id, 'light');
    if (!resource) return NextResponse.json({ status: 'error', error: 'The resource was not found.' }, { status: 404 });
    if (resource.tier === 'FREE') {
      return NextResponse.json(
        { status: 'error', error: 'File-based tests are available on Pro and Elite.' },
        { status: 403 }
      );
    }
    const mcqCount = count(body.counts?.mcq, 30);
    const shortCount = count(body.counts?.short, 15);
    const longCount = count(body.counts?.long, 8);
    if (mcqCount + shortCount + longCount === 0) {
      return NextResponse.json({ status: 'error', error: 'Select at least one question.' }, { status: 400 });
    }
    const context = await fetchResourceContext(resource);
    const artifactKey = createArtifactKey('resource-test', {
      prompt: 2,
      kind,
      id: body.id,
      title: resource.title,
      context,
      mcqCount,
      shortCount,
      longCount,
    });
    const cached = await readAiArtifact<{
      paper: FullTestPaper;
      provider: string;
      fallbackUsed: boolean;
    }>(artifactKey);
    if (cached) {
      return NextResponse.json({
        status: 'success',
        data: {
          paper: cached.paper,
          resourceTitle: resource.title,
          fallbackUsed: cached.fallbackUsed,
          cached: true,
          source: buildResourceEvidence(resource.title, context, cached.fallbackUsed ? 100 : 88),
        },
        provider: cached.provider,
      });
    }
    const featureLimit = await checkFileTestLimit(user.id, resource.tier);
    if (!featureLimit.success) {
      return NextResponse.json(
        { status: 'error', error: 'The monthly file-based test limit has been reached.' },
        { status: 429 }
      );
    }
    const limit = await checkAiMessageLimit(user.id, resource.tier, 'resource_test_generate');
    if (!limit.success) {
      return NextResponse.json({ status: 'error', error: "Today's AI limit has been reached." }, { status: 429 });
    }
    const modelContext = await buildHybridResourceContext({
      resourceKey: `${kind}:${body.id}`,
      source: context,
      query:
        'testable facts concepts definitions formulas applications comparisons examples MCQs short and long questions',
    }).catch(() => buildRepresentativeTextContext(context));
    const fallback: FullTestPaper = {
      title: `${resource.title} - AI Test`,
      totalMarks: mcqCount + shortCount * 3 + longCount * 8,
      timeAllowed: Math.max(15, mcqCount + shortCount * 5 + longCount * 12),
      mcqs: [],
      shortQs: [],
      longQs: [],
    };
    const sourcePaper = buildResourceSourceTest(resource.title, context, {
      mcq: mcqCount,
      short: shortCount,
      long: longCount,
    });
    let paper = fallback;
    let provider = 'source-fallback';
    let fallbackUsed = false;
    try {
      const result = await gatewayChat({
        provider: 'local',
        tier: 'medium',
        maxTokens: 8192,
        temperature: 0.25,
        messages: [
          {
            role: 'system',
            content: `You are an expert exam setter. ${verifiedSourceInstruction()} Return valid JSON only, with no markdown fences.`,
          },
          {
            role: 'user',
            content: `Create a high-quality test strictly from the facts and concepts in this resource.\nExact counts: ${mcqCount} MCQs, ${shortCount} short questions, ${longCount} long questions.\n\nMCQ QUALITY RULES:\n- Every question must be self-contained and directly test a named concept, fact, definition, formula, application, comparison, or worked example.\n- Never write meta questions such as "According to the file/source/document...", "Which option is supported by the text?", or "What does the uploaded material say?"\n- Never mention the file, source, document, passage, notes, or upload in any question or option.\n- Use four distinct, plausible subject-specific options with exactly one correct answer.\n- Avoid "all of the above", "none of the above", placeholder options, and repeated questions.\n- Explanations must state the relevant concept and why the answer is correct.\n- If the material cannot support the requested count without repetition or invention, return fewer questions rather than filler.\n\nWritten questions need marks and source-grounded key points.\n\nReturn exactly:\n{"title":"...","totalMarks":number,"timeAllowed":number,"mcqs":[{"q":"...","opts":["A","B","C","D"],"correct":0,"exp":"..."}],"shortQs":[{"q":"...","marks":3,"keyPoints":["..."]}],"longQs":[{"q":"...","marks":8,"keyPoints":["..."],"guide":"..."}]}\n\nRESOURCE: ${resource.title}\n\nSOURCE TEXT (representative sections from the attached TXT):\n${modelContext}`,
          },
        ],
      });
      paper = parseAiJson<FullTestPaper>(result.text, fallback);
      provider = result.providerUsed;
    } catch (gatewayError) {
      fallbackUsed = true;
      console.warn('Local test model unavailable; using source fallback:', gatewayError);
      paper = sourcePaper;
    }
    paper.mcqs = filterHighQualitySourceMcqs([...(paper.mcqs || []), ...sourcePaper.mcqs]).slice(0, mcqCount);
    paper.shortQs = [...(paper.shortQs || []), ...sourcePaper.shortQs].slice(0, shortCount);
    paper.longQs = [...(paper.longQs || []), ...sourcePaper.longQs].slice(0, longCount);
    paper.totalMarks =
      paper.mcqs.length +
      paper.shortQs.reduce((sum, item) => sum + item.marks, 0) +
      paper.longQs.reduce((sum, item) => sum + item.marks, 0);
    await writeAiArtifact(artifactKey, { paper, provider, fallbackUsed });
    await consumeAiCredits(user.id, resource.tier, 'resource_test_generate');
    return NextResponse.json({
      status: 'success',
      data: {
        paper,
        resourceTitle: resource.title,
        fallbackUsed,
        cached: false,
        source: buildResourceEvidence(resource.title, context, fallbackUsed ? 100 : 88),
      },
      provider,
    });
  } catch (error) {
    console.error('Gemini resource test generation failed:', error);
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'The test could not be generated.' },
      { status: 500 }
    );
  }
}
