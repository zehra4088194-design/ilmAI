import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkOcrLimit } from '@/lib/rate-limit';
import { performSelfHostedOcr } from '@/lib/ocr';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 180;

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
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

    if (!file) return NextResponse.json({ status: 'error', error: 'PDF file required hai' }, { status: 400 });
    if (!isPdfFile(file)) {
      return NextResponse.json({ status: 'error', error: 'Sirf PDF file upload karo.' }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { status: 'error', error: 'PDF 25MB se choti aur maximum 30 pages ki honi chahiye.' },
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

    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const result = await performSelfHostedOcr({
      fileBuffer: pdfBuffer,
      mimeType: 'application/pdf',
      filename: file.name,
      timeoutMs: 180_000,
    });

    return NextResponse.json({
      status: 'success',
      source: `${result.provider}-pdf`,
      text: result.text,
      data: {
        text: result.text,
        pages: [{ page: 1, text: result.text, source: `${result.provider}-pdf` }],
        pageCount: result.pages || 1,
        usedOcr: result.provider !== 'native-pdf',
        provider: result.provider,
        fallbackTriggered: false,
        remaining: limitCheck.remaining,
        reset: limitCheck.reset,
      },
    });
  } catch (error) {
    console.error('PDF extract error:', error);
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json(
      {
        status: 'error',
        error: message.includes('pages') ? message : 'PDF extract nahi ho saka. Clear ya supported PDF ke saath dobara try karo.',
      },
      { status: 500 }
    );
  }
}
