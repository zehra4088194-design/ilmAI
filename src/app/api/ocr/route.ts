import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { performOcr, validateOcrFile } from '@/lib/ocr';
import { checkOcrCredits, consumeOcrCredits } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ status: 'error', error: 'Authentication is required' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const kindValue = formData.get('kind');
    const kind = kindValue === 'diagram' || kindValue === 'handwritten' ? kindValue : 'printed';
    const language = String(formData.get('language') || 'en');
    const mode = kind === 'handwritten' || kind === 'diagram' ? 'handwritten' : 'printed';
    if (!file) {
      return NextResponse.json({ status: 'error', error: 'A file is required' }, { status: 400 });
    }

    const validation = validateOcrFile(file.type, file.size);
    if (!validation.valid) {
      return NextResponse.json({ status: 'error', error: validation.error }, { status: 400 });
    }

    const limitCheck = await checkOcrCredits(user.id, tier, mode);
    if (!limitCheck.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: `Not enough credits for this ${mode} scan.`,
        },
        { status: 429 }
      );
    }

    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const result = await performOcr({
      imageBuffer,
      mimeType: file.type,
      userTier: tier,
      mode,
      preferGemini: kind !== 'printed' || language !== 'ur',
    });
    const charged = await consumeOcrCredits(user.id, tier, mode);

    return NextResponse.json({
      status: 'success',
      data: {
        text: result.text,
        provider: result.provider,
        fallbackTriggered: result.fallbackTriggered,
        remaining: charged.remaining,
        creditCost: charged.creditCost,
        reset: charged.reset,
      },
    });
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json({ status: 'error', error: 'The scan failed. Please try again.' }, { status: 500 });
  }
}
