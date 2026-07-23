import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkUniversityFeatureLimit, getUniversityLimitExceededMessage } from '@/lib/rate-limit';
import { gatewayChat } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 50000) : '';
}

async function summarizeAndMap(pdfText: string) {
  const clippedText = pdfText.slice(0, 50000);
  const prompt = `Analyze the extracted PDF text below as a university research assistant.

Tasks:
1. Write a detailed but student-friendly summary in three sections: methodology, key findings, conclusion.
2. If the document is not a research paper, still summarize the document's method/approach, important points, and conclusion.
3. Generate simple Mermaid flowchart code showing the document's core concepts and relationships.
4. Keep each summary section substantial: 5-8 clear sentences, with examples or named concepts from the PDF where available.

Rules:
- Base the answer only on the extracted text.
- Do not invent citations, authors, statistics, or claims not present in the text.
- If extraction quality is poor, summarize whatever is readable and mention that limitation inside the relevant field.
- Return ONLY valid JSON. No markdown fences.`;
  const result = await gatewayChat({
    provider: 'groq',
    tier: 'medium',
    messages: [
      {
        role: 'system',
        content:
          'You are a careful university PDF summarizer. Return only valid JSON exactly matching the requested schema.',
      },
      {
        role: 'user',
        content: `${prompt}

Required JSON shape:
{"summary":{"methodology":"...","key_findings":"...","conclusion":"..."},"mermaid_code":"flowchart TD\\n  A[...] --> B[...]"}

Document text:
${clippedText}`,
      },
    ],
    maxTokens: 6000,
    temperature: 0.2,
  });

  const parsed = parseAiJson<{
    summary?: {
      methodology?: unknown;
      key_findings?: unknown;
      keyFindings?: unknown;
      conclusion?: unknown;
    };
    mermaid_code?: unknown;
    mermaidCode?: unknown;
  }>(result.text, {});
  return {
    summary: {
      methodology: String(
        parsed?.summary?.methodology || 'The methodology could not be extracted. Try again with a clearer PDF.'
      ),
      key_findings: String(
        parsed?.summary?.key_findings || parsed?.summary?.keyFindings || 'The key findings could not be extracted.'
      ),
      conclusion: String(parsed?.summary?.conclusion || 'The conclusion could not be extracted.'),
    },
    mermaid_code: String(
      parsed?.mermaid_code ||
        parsed?.mermaidCode ||
        'flowchart TD\n  A[Research Problem] --> B[Methodology]\n  B --> C[Key Findings]\n  C --> D[Conclusion]'
    ),
    provider: result.providerUsed,
    routeReason: 'ocr_space_text_to_groq_summary',
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const body = await req.json();
    const pdfText = clean(body.pdfText);
    if (pdfText.length < 20)
      return NextResponse.json(
        { status: 'error', error: 'The PDF text could not be extracted. Upload a PDF with clearer text.' },
        { status: 400 }
      );

    const limit = await checkUniversityFeatureLimit(user.id, tier, 'pdf_summarizer');
    if (!limit.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: await getUniversityLimitExceededMessage(tier, limit.scope, 'PDF Summarizer'),
        },
        { status: 429 }
      );
    }

    const result = await summarizeAndMap(pdfText);
    return NextResponse.json({ status: 'success', data: result });
  } catch {
    return NextResponse.json({ status: 'error', error: 'The PDF could not be summarized.' }, { status: 500 });
  }
}
