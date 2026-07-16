import { NextRequest, NextResponse } from 'next/server';
import { gatewayChat, MARKDOWN_ANSWER_FORMAT_INSTRUCTION } from '@/lib/ai/gateway';
import { performOcr, validateOcrFile } from '@/lib/ocr';
import { createClient } from '@/lib/supabase/server';
import { checkOcrLimit } from '@/lib/rate-limit';
import type { SubscriptionTier } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SCAN_TYPES = ['textbook_page', 'handwritten', 'diagram', 'math', 'chemistry', 'biology'] as const;
const LANGUAGES = ['en', 'ur', 'hi'] as const;

function isScanType(value: FormDataEntryValue | null): value is (typeof SCAN_TYPES)[number] {
  return typeof value === 'string' && SCAN_TYPES.includes(value as (typeof SCAN_TYPES)[number]);
}

function isLanguage(value: FormDataEntryValue | null): value is (typeof LANGUAGES)[number] {
  return typeof value === 'string' && LANGUAGES.includes(value as (typeof LANGUAGES)[number]);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
    const tier = ((profile as any)?.subscription_tier || 'FREE') as SubscriptionTier;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const scanType = isScanType(formData.get('scan_type'))
      ? (formData.get('scan_type') as (typeof SCAN_TYPES)[number])
      : 'textbook_page';
    const language = isLanguage(formData.get('language'))
      ? (formData.get('language') as (typeof LANGUAGES)[number])
      : 'en';
    const chapterId =
      typeof formData.get('chapter_id') === 'string' && formData.get('chapter_id')
        ? String(formData.get('chapter_id'))
        : null;

    if (!file) return NextResponse.json({ status: 'error', error: 'Image required hai' }, { status: 400 });
    const validation = validateOcrFile(file.type, file.size);
    if (!validation.valid) return NextResponse.json({ status: 'error', error: validation.error }, { status: 400 });

    const mode = scanType === 'handwritten' || scanType === 'math' ? 'handwritten' : 'printed';
    const scanLimit = await checkOcrLimit(user.id, tier, mode);
    if (!scanLimit.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: `${mode === 'handwritten' ? 'Handwritten' : 'Printed'} scans ki weekly limit complete ho gayi. ${new Date(scanLimit.reset).toLocaleDateString('en-PK')} ko reset hogi.`,
        },
        { status: 429 }
      );
    }

    const scanId = crypto.randomUUID();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const storagePath = `${user.id}/${scanId}.${ext}`;
    const imageBuffer = Buffer.from(await file.arrayBuffer());

    const upload = await supabase.storage.from('vision-scans').upload(storagePath, imageBuffer, {
      contentType: file.type,
      upsert: false,
    });
    if (upload.error) throw upload.error;

    await db.from('vision_scans').insert({
      id: scanId,
      student_id: user.id,
      scan_type: scanType,
      image_url: storagePath,
      language,
      chapter_id: chapterId,
    });

    const ocr = await performOcr({ imageBuffer, mimeType: file.type, userTier: tier, mode });

    const result = await gatewayChat({
      provider: 'gemini',
      tier: tier === 'ELITE' ? 'pro' : 'medium',
      messages: [
        {
          role: 'system',
          content: `You are ilm AI Vision Tutor. Explain scanned homework/textbook content step by step. Reply in ${language}. ${MARKDOWN_ANSWER_FORMAT_INSTRUCTION}`,
        },
        {
          role: 'user',
          content: `Scan type: ${scanType}\nOCR text:\n${ocr.text || '[No clear OCR text extracted]'}\n\nGive a student-friendly explanation, identify formulas/diagrams if relevant, and warn if OCR is unclear.`,
        },
      ],
      maxTokens: 2200,
      temperature: 0.35,
    });

    await db.from('vision_scans').update({ ocr_text: ocr.text, ai_explanation: result.text }).eq('id', scanId);

    return NextResponse.json({
      status: 'success',
      data: {
        id: scanId,
        scan_type: scanType,
        language,
        image_path: storagePath,
        ocr_text: ocr.text,
        ai_explanation: result.text,
        ocr_provider: ocr.provider,
        remaining_scans: scanLimit.remaining,
        scans_reset_at: scanLimit.reset,
      },
    });
  } catch (error) {
    console.error('Vision scan error:', error);
    return NextResponse.json({ status: 'error', error: 'Vision scan process nahi ho saka.' }, { status: 500 });
  }
}
