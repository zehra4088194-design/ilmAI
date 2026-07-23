import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkUniversityFeatureLimit, getUniversityLimitExceededMessage } from '@/lib/rate-limit';
import { gatewayChat } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';

const STYLES = ['APA 7th Edition', 'MLA 9th Edition', 'Harvard', 'IEEE', 'Chicago'] as const;
type CitationStyle = (typeof STYLES)[number];

type CitationDraft = {
  style: CitationStyle;
  in_text: string;
  full_reference: string;
  verification_note: string;
};

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 500) : '';
}

async function generateCitations(input: string, styles: CitationStyle[]) {
  const prompt = `Act as an expert academic librarian.
Input source details, URL, DOI, or title: ${input}
Citation styles: ${styles.join(', ')}

Return ONLY valid JSON:
{"citations":[{"style":"exact requested style","in_text":"...","full_reference":"...","verification_note":"..."}]}

Rules:
- Return exactly one citation object for every requested style.
- If exact metadata is missing, create the best draft from the provided input and clearly say what must be verified in verification_note.
- Do not pretend you accessed live databases.
- Keep the reference style-specific and submission-ready after user verification.`;

  const result = await gatewayChat({
    provider: 'gemini',
    tier: 'pro',
    messages: [
      { role: 'system', content: 'You are a careful citation generator. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ],
    maxTokens: 1400,
    temperature: 0.2,
  });

  const parsed = parseAiJson<{
    citations?: Array<{
      style?: string;
      in_text?: string;
      full_reference?: string;
      verification_note?: string;
    }>;
  }>(result.text, {});

  return styles.map((style): CitationDraft => {
    const citation = parsed.citations?.find((item) => item.style === style);
    return {
      style,
      in_text: citation?.in_text || 'Citation draft unavailable',
      full_reference: citation?.full_reference || `${input}. Verify source details before submission.`,
      verification_note:
        citation?.verification_note || 'Verify author, date, title, publisher/journal, DOI/URL before submission.',
    };
  });
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
    const input = clean(body.input);
    const style = clean(body.style);
    const requestedStyles: CitationStyle[] = Array.isArray(body.styles)
      ? body.styles
          .map((item: unknown) => clean(item))
          .filter((item: string): item is CitationStyle => STYLES.includes(item as CitationStyle))
      : [];
    const styles = Array.from(new Set<CitationStyle>(requestedStyles));
    if (!input)
      return NextResponse.json(
        { status: 'error', error: 'Enter an article URL, DOI, book title, or author name.' },
        { status: 400 }
      );
    if (styles.length === 0 && !STYLES.includes(style as CitationStyle))
      return NextResponse.json({ status: 'error', error: 'Select a valid citation style.' }, { status: 400 });

    const citationStyles = styles.length > 0 ? styles : [style as CitationStyle];

    const limit = await checkUniversityFeatureLimit(user.id, tier, 'citation');
    if (!limit.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: await getUniversityLimitExceededMessage(tier, limit.scope, 'Citation Generator'),
        },
        { status: 429 }
      );
    }

    const citations = await generateCitations(input, citationStyles);
    return NextResponse.json({
      status: 'success',
      data: styles.length > 0 ? { citations } : citations[0],
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'The citation could not be generated.' },
      { status: 500 }
    );
  }
}
