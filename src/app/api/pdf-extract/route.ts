import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkOcrLimit, checkProviderDailyLimit } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GATEWAY_URL = process.env.AI_GATEWAY_URL || 'https://ilm-ai1.noorhusnain791.workers.dev';
const GATEWAY_SECRET = process.env.AI_GATEWAY_SECRET || '';

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

async function extractPdfWithOcrSpace(pdfBuffer: Buffer) {
  const res = await fetch(`${GATEWAY_URL}/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GATEWAY_SECRET}` },
    body: JSON.stringify({
      mode: 'printed',
      imageBase64: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
      strict_provider: true,
    }),
    signal: AbortSignal.timeout(55000),
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : { error: await res.text() };
  if (!res.ok) {
    throw new Error(data?.error || `OCR.space PDF extraction failed (${res.status})`);
  }
  return {
    text: String(data?.text || '').trim(),
    provider: String(data?.providerUsed || 'ocr-space'),
    fallbackTriggered: Boolean(data?.fallbackTriggered),
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ status: 'error', error: 'PDF file required hai' }, { status: 400 });
    }
    if (!isPdfFile(file)) {
      return NextResponse.json({ status: 'error', error: 'Sirf PDF file upload karo.' }, { status: 400 });
    }
    if (file.size > 900_000) {
      return NextResponse.json(
        { status: 'error', error: 'Free PDF OCR ke liye PDF 900KB aur maximum 3 pages honi chahiye.' },
        { status: 400 }
      );
    }

    const limitCheck = await checkOcrLimit(user.id, tier, 'printed');
    if (!limitCheck.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: `Printed/PDF scans ki weekly limit complete ho gayi. ${new Date(limitCheck.reset).toLocaleDateString('en-PK')} ko reset hogi.`,
        },
        { status: 429 }
      );
    }

    const providerBudget = await checkProviderDailyLimit('ocrSpace');
    if (!providerBudget.success) {
      return NextResponse.json(
        { status: 'error', error: 'Aaj ka platform PDF OCR budget complete ho gaya. Kal dobara try karo.' },
        { status: 429 }
      );
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const result = await extractPdfWithOcrSpace(pdfBuffer);

    if (!result.text.trim()) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'OCR.space se readable PDF text nahi nikla. Clear/text PDF ya choti scan file upload karo.',
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      status: 'success',
      source: `${result.provider}-pdf`,
      text: result.text,
      data: {
        text: result.text,
        pages: [{ page: 1, text: result.text, source: `${result.provider}-pdf` }],
        usedOcr: true,
        provider: result.provider,
        fallbackTriggered: result.fallbackTriggered,
        remaining: limitCheck.remaining,
        reset: limitCheck.reset,
      },
    });
  } catch (error) {
    console.error('PDF extract error:', error);
    return NextResponse.json(
      { status: 'error', error: 'PDF extract nahi ho saka. Dobara clear PDF ke saath try karo.' },
      { status: 500 }
    );
  }
}
