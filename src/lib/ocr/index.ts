import type { SubscriptionTier } from '@/types';
import sharp from 'sharp';
import { checkProviderDailyLimit } from '@/lib/rate-limit';

const GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://127.0.0.1:8787';
const GATEWAY_SECRET = process.env.AI_GATEWAY_SECRET || '';
const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || 'http://127.0.0.1:8000';
const OCR_SERVICE_SECRET = process.env.OCR_SERVICE_SECRET || '';
const GEMINI_SAFE_BYTES = 4 * 1024 * 1024;

export type OcrProvider =
  | 'self-hosted-tesseract'
  | 'self-hosted-ocrmypdf'
  | 'native-pdf'
  | 'gemini-vision'
  | 'ocr-space';

export interface OcrResult {
  text: string;
  provider: OcrProvider;
  fallbackTriggered?: boolean;
  confidence?: number;
  pages?: number;
}

export interface OcrRequest {
  imageBuffer: Buffer;
  mimeType: string;
  userTier: SubscriptionTier;
  mode?: 'printed' | 'handwritten';
  timeoutMs?: number;
}

async function optimizeImageForGemini(imageBuffer: Buffer, mimeType: string) {
  const supported = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimeType.toLowerCase());
  if (imageBuffer.length <= GEMINI_SAFE_BYTES && supported) return { imageBuffer, mimeType };

  try {
    const base = sharp(imageBuffer, { animated: false })
      .rotate()
      .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalise();

    for (const quality of [84, 74, 64, 54, 44]) {
      const nextBuffer = await base.jpeg({ quality, mozjpeg: true }).toBuffer();
      if (nextBuffer.length <= GEMINI_SAFE_BYTES || quality === 44) {
        return { imageBuffer: nextBuffer, mimeType: 'image/jpeg' };
      }
    }
  } catch (error) {
    console.warn('Gemini OCR image optimization failed, using original image:', error);
  }

  return { imageBuffer, mimeType };
}

async function readJsonResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return { error: await res.text() };
}

function normalizeLocalProvider(value: unknown): OcrProvider {
  if (value === 'self-hosted-ocrmypdf' || value === 'native-pdf') return value;
  return 'self-hosted-tesseract';
}

export async function performSelfHostedOcr({
  fileBuffer,
  mimeType,
  mode = 'printed',
  timeoutMs = 180_000,
  filename,
}: {
  fileBuffer: Buffer;
  mimeType: string;
  mode?: 'printed' | 'handwritten';
  timeoutMs?: number;
  filename?: string;
}): Promise<OcrResult> {
  if (!OCR_SERVICE_SECRET) throw new Error('OCR_SERVICE_SECRET is not configured');

  const form = new FormData();
  const extension = mimeType === 'application/pdf' ? 'pdf' : mimeType.includes('png') ? 'png' : 'jpg';
  form.append('file', new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), filename || `scan.${extension}`);
  form.append('mode', mode);
  form.append('languages', 'eng+urd');

  const res = await fetch(`${OCR_SERVICE_URL}/v1/ocr`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OCR_SERVICE_SECRET}` },
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await readJsonResponse(res);
  if (!res.ok) throw new Error(data.detail || data.error || `Self-hosted OCR failed (${res.status})`);

  const text = String(data.text || '').trim();
  if (!text) throw new Error('Self-hosted OCR returned empty text');
  return {
    text,
    provider: normalizeLocalProvider(data.providerUsed),
    pages: Number(data.pages) || 1,
  };
}

async function performGeminiOcr(imageBuffer: Buffer, mimeType: string, timeoutMs: number): Promise<OcrResult> {
  const budget = await checkProviderDailyLimit('gemini');
  if (!budget.success) throw new Error('Gemini ka platform free daily budget complete ho gaya.');

  const optimized = await optimizeImageForGemini(imageBuffer, mimeType);
  const res = await fetch(`${GATEWAY_URL}/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GATEWAY_SECRET}` },
    body: JSON.stringify({
      mode: 'handwritten',
      imageBase64: optimized.imageBuffer.toString('base64'),
      mimeType: optimized.mimeType,
      strict_provider: true,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await readJsonResponse(res);
  if (!res.ok) throw new Error(data.error || `Gemini OCR request failed (${res.status})`);

  const text = String(data.text || '').trim();
  if (!text) throw new Error('Gemini OCR returned empty text');
  return { text, provider: 'gemini-vision', pages: 1 };
}

async function performOcrSpace(imageBuffer: Buffer, mimeType: string, timeoutMs: number): Promise<OcrResult> {
  const budget = await checkProviderDailyLimit('ocrSpace');
  if (!budget.success) throw new Error('OCR.space ka platform daily budget complete ho gaya.');

  const optimized = mimeType === 'application/pdf' ? { imageBuffer, mimeType } : await optimizeImageForGemini(imageBuffer, mimeType);
  const res = await fetch(`${GATEWAY_URL}/ocr-space`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GATEWAY_SECRET}` },
    body: JSON.stringify({
      imageBase64: optimized.imageBuffer.toString('base64'),
      mimeType: optimized.mimeType,
      language: 'eng',
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await readJsonResponse(res);
  if (!res.ok) throw new Error(data.error || `OCR.space request failed (${res.status})`);

  const text = String(data.text || '').trim();
  if (!text) throw new Error('OCR.space returned empty text');
  return { text, provider: 'ocr-space', pages: 1 };
}

export async function performOcr({
  imageBuffer,
  mimeType,
  mode: requestedMode,
  timeoutMs = 60_000,
}: OcrRequest): Promise<OcrResult> {
  const mode = requestedMode || 'printed';
  const attempts =
    mode === 'handwritten'
      ? [
          () => performGeminiOcr(imageBuffer, mimeType, timeoutMs),
          () => performOcrSpace(imageBuffer, mimeType, timeoutMs),
          () => performSelfHostedOcr({ fileBuffer: imageBuffer, mimeType, mode, timeoutMs }),
        ]
      : [
          () => performSelfHostedOcr({ fileBuffer: imageBuffer, mimeType, mode, timeoutMs }),
          () => performOcrSpace(imageBuffer, mimeType, timeoutMs),
          () => performGeminiOcr(imageBuffer, mimeType, timeoutMs),
        ];
  let lastError: unknown;

  for (let index = 0; index < attempts.length; index++) {
    const attempt = attempts[index];
    if (!attempt) continue;
    try {
      const result = await attempt();
      return { ...result, fallbackTriggered: index > 0 };
    } catch (error) {
      lastError = error;
    }
  }

  console.error('OCR failed on all configured providers:', lastError);
  throw lastError instanceof Error ? lastError : new Error('OCR failed on all providers');
}

export function validateOcrFile(mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  const maxSize = 12 * 1024 * 1024;
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowed.includes(mimeType.toLowerCase())) {
    return { valid: false, error: 'JPG, PNG ya WebP image upload karo' };
  }
  if (sizeBytes > maxSize) return { valid: false, error: 'Image 12MB se choti honi chahiye' };
  return { valid: true };
}
