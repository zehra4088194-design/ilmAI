import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { performOcr, validateOcrFile, OCR_FREE_DAILY_LIMIT } from '@/lib/ocr';
import { checkOcrLimit } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });
    }

    // Fetch user's subscription tier to decide OCR provider + rate limit
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';

    // Enforce daily limit (Free: 5/day via OCR.space, Pro/Elite: 200/day via Gemini Vision)
    const limitCheck = await checkOcrLimit(user.id, tier);
    if (!limitCheck.success) {
      return NextResponse.json({
        status: 'error',
        error: tier === 'FREE'
          ? `Aaj ke ${OCR_FREE_DAILY_LIMIT} free scans khatam ho gaye. Pro plan lo unlimited scans ke liye!`
          : 'Daily scan limit khatam ho gayi, kal phir try karo.',
        remaining: 0,
      }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ status: 'error', error: 'Koi file nahi mili' }, { status: 400 });
    }

    const validation = validateOcrFile(file.type, file.size);
    if (!validation.valid) {
      return NextResponse.json({ status: 'error', error: validation.error }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await performOcr({ imageBuffer: buffer, mimeType: file.type, userTier: tier });

    if (!result.text) {
      return NextResponse.json({
        status: 'error',
        error: 'Is image mein text detect nahi ho saka. Behtar lighting/quality ke saath try karo.',
      }, { status: 422 });
    }

    return NextResponse.json({
      status: 'success',
      data: {
        text: result.text,
        provider: result.provider,
        fallbackTriggered: result.fallbackTriggered || false,
        remaining: limitCheck.remaining,
      },
    });
  } catch (error) {
    console.error('OCR API error:', error);
    return NextResponse.json({ status: 'error', error: 'OCR processing failed. Dobara try karo.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Quick endpoint for the UI to check remaining scans before showing the upload button
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';
    const limitCheck = await checkOcrLimit(user.id, tier);

    return NextResponse.json({
      status: 'success',
      data: { remaining: limitCheck.remaining, tier, provider: tier === 'FREE' ? 'ocr-space' : 'gemini-vision' },
    });
  } catch {
    return NextResponse.json({ status: 'error', error: 'Could not check limit' }, { status: 500 });
  }
}
