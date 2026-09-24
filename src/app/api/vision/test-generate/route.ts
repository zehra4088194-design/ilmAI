import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { gatewayChat } from '@/lib/ai/gateway';
import { checkAiMessageLimit, consumeAiCredits } from '@/lib/rate-limit';
import { parseAiJson } from '@/lib/utils/json-extract';
import { verifiedSourceInstruction } from '@/lib/resources/evidence';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getAdminAiProvider } from '@/lib/platform-settings/shared';
import type { AiProviderId } from '@/lib/ai/gateway';
import type { FullTestPaper } from '@/app/api/ai/full-test/route';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_SOURCE_CHARS = 24000;

function count(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.floor(parsed), 0), max) : fallback;
}

/**
 * "Scan a page, get a test from it": a student who read something physically (a textbook page,
 * their own notes, a handout) photographs it, the client OCRs it (via /api/ocr, one or more
 * pages) and sends the combined text here. This builds an AI-graded FullTestPaper strictly from
 * that text — same shape/quality bar as the resource-test generator, just sourced from a scan
 * instead of a library resource, and gated on the shared AI credit pool like every other AI tool
 * (no separate "Pro only" wall — any tier can do this as long as they have credits left).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required.' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';

    const body = await req.json();
    const text = String(body.text || '').trim();
    if (text.length < 40) {
      return NextResponse.json(
        { status: 'error', error: 'The scanned text is too short to build a test from. Scan a fuller page.' },
        { status: 400 }
      );
    }
    const title = String(body.title || 'Scanned Page Test')
      .trim()
      .slice(0, 120);
    const mcqCount = count(body.mcqCount, 8, 30);
    const shortCount = count(body.shortCount, 4, 15);
    const longCount = count(body.longCount, 2, 8);
    if (mcqCount + shortCount + longCount === 0) {
      return NextResponse.json({ status: 'error', error: 'Select at least one question.' }, { status: 400 });
    }

    const limit = await checkAiMessageLimit(user.id, tier, 'vision_test_generate');
    if (!limit.success) {
      return NextResponse.json(
        { status: 'error', error: 'The shared AI credit balance has been used for today.' },
        { status: 429 }
      );
    }

    const sourceText = text.slice(0, MAX_SOURCE_CHARS);
    const fallback: FullTestPaper = {
      title,
      totalMarks: mcqCount + shortCount * 3 + longCount * 8,
      timeAllowed: Math.max(15, mcqCount + shortCount * 5 + longCount * 12),
      mcqs: [],
      shortQs: [],
      longQs: [],
    };

    const platformSettings = await getPlatformSettings();
    const adminProvider = getAdminAiProvider(platformSettings, 'resourceTest');
    const providerToUse: AiProviderId = adminProvider === 'local' ? 'groq' : adminProvider;

    const result = await gatewayChat({
      provider: providerToUse,
      tier: 'mini',
      maxTokens: 8192,
      temperature: 0.25,
      strictProvider: true,
      routingPolicy: 'text',
      messages: [
        {
          role: 'system',
          content: `You are an expert exam setter. ${verifiedSourceInstruction()} Return valid JSON only, with no markdown fences.`,
        },
        {
          role: 'user',
          content: `Create a high-quality test strictly from the facts and concepts in this scanned page's text.\nExact counts: ${mcqCount} MCQs, ${shortCount} short questions, ${longCount} long questions.\n\nMCQ QUALITY RULES:\n- Every question must be self-contained and directly test a named concept, fact, definition, formula, application, comparison, or worked example.\n- Never write meta questions such as "According to the text/scan/page...", "Which option is supported by the text?", or "What does the scanned material say?"\n- Never mention the scan, photo, page, source, or upload in any question or option.\n- Use four distinct, plausible subject-specific options with exactly one correct answer.\n- Avoid "all of the above", "none of the above", placeholder options, and repeated questions.\n- Explanations must state the relevant concept and why the answer is correct.\n- If the material cannot support the requested count without repetition or invention, return fewer questions rather than filler.\n\nWritten questions need marks and source-grounded key points.\n\nReturn exactly:\n{"title":"...","totalMarks":number,"timeAllowed":number,"mcqs":[{"q":"...","opts":["A","B","C","D"],"correct":0,"exp":"..."}],"shortQs":[{"q":"...","marks":3,"keyPoints":["..."]}],"longQs":[{"q":"...","marks":8,"keyPoints":["..."],"guide":"..."}]}\n\nSCANNED TEXT:\n${sourceText}`,
        },
      ],
    });

    const paper = parseAiJson<FullTestPaper>(result.text, fallback);
    if (!paper.mcqs?.length && !paper.shortQs?.length && !paper.longQs?.length) {
      return NextResponse.json(
        { status: 'error', error: 'No usable questions could be built from this scan. Try a clearer or fuller page.' },
        { status: 409 }
      );
    }
    await consumeAiCredits(user.id, tier, 'vision_test_generate');

    return NextResponse.json({ status: 'success', data: { paper: { ...paper, title: paper.title || title } } });
  } catch (error) {
    console.error('Vision test generation failed:', error);
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'The test could not be generated.' },
      { status: 500 }
    );
  }
}
