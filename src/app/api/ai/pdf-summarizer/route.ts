import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAiMessageLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import { gatewayChat } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 25000) : '';
}

async function summarizeAndMap(pdfText: string) {
  const prompt = `Analyze this text. 1) Provide a 3-paragraph summary covering Methodology, Key Findings, and Conclusion. 2) Generate a Mermaid.js flowchart code representing the core concepts and their relationships. Return the response in JSON format with 'summary' and 'mermaid_code' keys.`;
  const result = await gatewayChat({
    provider: 'groq',
    tier: 'medium',
    messages: [
      {
        role: 'system',
        content: 'You are a university research paper assistant. Return only valid JSON. Do not invent citations or facts not present in the text.',
      },
      {
        role: 'user',
        content: `${prompt}

Required JSON shape:
{"summary":{"methodology":"...","key_findings":"...","conclusion":"..."},"mermaid_code":"flowchart TD\\n  A[...] --> B[...]"}

Document text:
${pdfText}`,
      },
    ],
    maxTokens: 2600,
    temperature: 0.25,
  });

  const parsed = parseAiJson<any>(result.text, {});
  return {
    summary: {
      methodology: String(parsed?.summary?.methodology || 'Methodology extract nahi ho saki. PDF text clear hai to dobara try karo.'),
      key_findings: String(parsed?.summary?.key_findings || parsed?.summary?.keyFindings || 'Key findings extract nahi ho sake.'),
      conclusion: String(parsed?.summary?.conclusion || 'Conclusion extract nahi ho saka.'),
    },
    mermaid_code: String(parsed?.mermaid_code || parsed?.mermaidCode || 'flowchart TD\n  A[Research Problem] --> B[Methodology]\n  B --> C[Key Findings]\n  C --> D[Conclusion]'),
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limit = await checkAiMessageLimit(user.id, tier, 'pdf_summarizer');
    if (!limit.success) return NextResponse.json({ status: 'error', error: await getConfiguredLimitExceededMessage(tier, 'PDF Summarizer') }, { status: 429 });

    const body = await req.json();
    const pdfText = clean(body.pdfText);
    if (pdfText.length < 20) return NextResponse.json({ status: 'error', error: 'PDF text extract nahi ho saka. Clear text wala PDF upload karo.' }, { status: 400 });

    const result = await summarizeAndMap(pdfText);
    return NextResponse.json({ status: 'success', data: result });
  } catch {
    return NextResponse.json({ status: 'error', error: 'PDF summarize nahi ho saka.' }, { status: 500 });
  }
}
