import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkUniversityFeatureLimit,
  consumeUniversityFeatureCredits,
  getUniversityLimitExceededMessage,
} from '@/lib/rate-limit';
import { gatewayChat } from '@/lib/ai/gateway';
import { resolveAiRoutingProvider } from '@/lib/platform-settings/server';
import { performPdfOcr } from '@/lib/ocr';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 180;

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
  const provider = await resolveAiRoutingProvider('resourceSummary');
  const result = await gatewayChat({
    provider,
    strictProvider: true,
    routingPolicy: 'text',
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
    routeReason: 'local_extracted_text_to_deepseek_summary',
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

    let pdfText = '';
    let uploadedFile: File | null = null;
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ status: 'error', error: 'A PDF file is required.' }, { status: 400 });
      }
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        return NextResponse.json({ status: 'error', error: 'Upload a PDF file.' }, { status: 400 });
      }
      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json(
          { status: 'error', error: 'The PDF must be smaller than 20 MB and contain no more than 30 pages.' },
          { status: 400 }
        );
      }
      uploadedFile = file;
    } else {
      const body = await req.json();
      pdfText = clean(body.pdfText);
      if (pdfText.length < 20) {
        return NextResponse.json(
          { status: 'error', error: 'The PDF text could not be extracted. Upload a PDF with clearer text.' },
          { status: 400 }
        );
      }
    }

    const limit = await checkUniversityFeatureLimit(user.id, tier, 'university_pdf_summarizer');
    if (!limit.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: await getUniversityLimitExceededMessage(tier, limit.scope, 'PDF Summarizer'),
        },
        { status: 429 }
      );
    }

    if (uploadedFile) {
      const extracted = await performPdfOcr({
        fileBuffer: Buffer.from(await uploadedFile.arrayBuffer()),
        mimeType: 'application/pdf',
        filename: uploadedFile.name,
        timeoutMs: 180_000,
      });
      pdfText = clean(extracted.text);
    }

    if (pdfText.length < 20) {
      return NextResponse.json(
        { status: 'error', error: 'The PDF text could not be extracted. Upload a PDF with clearer text.' },
        { status: 400 }
      );
    }

    const result = await summarizeAndMap(pdfText);
    const charged = await consumeUniversityFeatureCredits(user.id, tier, 'university_pdf_summarizer');
    return NextResponse.json({
      status: 'success',
      data: { ...result, extracted_text: pdfText, credit_cost: 2, remaining_credits: charged.remaining },
    });
  } catch {
    return NextResponse.json({ status: 'error', error: 'The PDF could not be summarized.' }, { status: 500 });
  }
}
