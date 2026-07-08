import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { performOcr, validateOcrFile } from '@/lib/ocr';
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const tier = (profile?.subscription_tier as SubscriptionTier) || 'FREE';

    const limitCheck = await checkOcrLimit(user.id, tier);
    if (!limitCheck.success) {
      return NextResponse.json(
        { status: 'error', error: 'Aaj ke scans khatam ho gaye. Kal phir try karo.' },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ status: 'error', error: 'File required hai' }, { status: 400 });
    }

    const validation = validateOcrFile(file.type, file.size);
    if (!validation.valid) {
      return NextResponse.json({ status: 'error', error: validation.error }, { status: 400 });
    }

    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const result = await performOcr({ imageBuffer, mimeType: file.type, userTier: tier });

    return NextResponse.json({
      status: 'success',
      data: { text: result.text, remaining: limitCheck.remaining },
    });
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { status: 'error', error: 'Scan fail ho gaya. Dobara try karo.' },
      { status: 500 }
    );
  }
}
