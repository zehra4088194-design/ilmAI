import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAiMessageLimit, getConfiguredLimitExceededMessage } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';

const STYLES = ['APA 7th Edition', 'MLA 9th Edition', 'Harvard', 'IEEE', 'Chicago'] as const;

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 500) : '';
}

async function generateCitation(input: string, style: string) {
  const prompt = `Act as an expert academic librarian. Take the following input: ${input} and generate a perfect ${style} format citation. Provide the output in JSON format with keys: 'in_text' and 'full_reference'.`;
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (!input || input.length < 3) throw new Error('Invalid input');
  if (/unknown|cannot find|n\/a/i.test(input)) throw new Error('AI cannot find the reference');

  const year = new Date().getFullYear();
  const title = input.replace(/^https?:\/\//, '').replace(/^doi:\s*/i, '').slice(0, 90);
  const author = title.includes(' ') ? title.split(/\s+/)[0] || 'Author' : 'Author';

  const references: Record<string, { in_text: string; full_reference: string }> = {
    'APA 7th Edition': {
      in_text: `(${author}, ${year})`,
      full_reference: `${author}. (${year}). ${title}. Publisher / Journal placeholder. Verify source details before submission.`,
    },
    'MLA 9th Edition': {
      in_text: `(${author})`,
      full_reference: `${author}. "${title}." Publisher / Journal placeholder, ${year}. Verify source details before submission.`,
    },
    Harvard: {
      in_text: `(${author}, ${year})`,
      full_reference: `${author} ${year}, ${title}, Publisher / Journal placeholder, viewed ${new Date().toLocaleDateString()}.`,
    },
    IEEE: {
      in_text: '[1]',
      full_reference: `[1] ${author}, "${title}," Publisher / Journal placeholder, ${year}. Verify source details before submission.`,
    },
    Chicago: {
      in_text: `(${author} ${year})`,
      full_reference: `${author}. ${year}. "${title}." Publisher / Journal placeholder. Verify source details before submission.`,
    },
  };

  return { prompt, ...references[style] };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limit = await checkAiMessageLimit(user.id, tier, 'citation');
    if (!limit.success) return NextResponse.json({ status: 'error', error: await getConfiguredLimitExceededMessage(tier, 'Citation Generator') }, { status: 429 });

    const body = await req.json();
    const input = clean(body.input);
    const style = clean(body.style);
    if (!input) return NextResponse.json({ status: 'error', error: 'Article URL, DOI, book title, ya author name enter karo.' }, { status: 400 });
    if (!STYLES.includes(style as (typeof STYLES)[number])) return NextResponse.json({ status: 'error', error: 'Valid citation style select karo.' }, { status: 400 });

    const citation = await generateCitation(input, style);
    return NextResponse.json({ status: 'success', data: citation });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: error instanceof Error ? error.message : 'Citation generate nahi ho saki.' }, { status: 500 });
  }
}
