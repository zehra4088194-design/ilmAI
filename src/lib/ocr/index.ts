// ============================================
// UNIFIED OCR SERVICE — routes through the Cloudflare Worker gateway
// - 'printed'     -> OCR.space (up to 20 keys, rotated)
// - 'handwritten' -> Gemini Vision (up to 20 keys, rotated)
// Each mode automatically falls back to the other if its configured keys fail.
// ============================================
import type { SubscriptionTier } from '@/types';
import sharp from 'sharp';
import { checkProviderDailyLimit } from '@/lib/rate-limit';

const GATEWAY_URL = process.env.AI_GATEWAY_URL || 'https://ilm-ai1.noorhusnain791.workers.dev';
const GATEWAY_SECRET = process.env.AI_GATEWAY_SECRET || '';
const OCR_SPACE_SAFE_BYTES = 900_000;

export interface OcrResult {
  text: string;
  provider: 'ocr-space' | 'gemini-vision';
  fallbackTriggered?: boolean;
  confidence?: number;
}

export interface OcrRequest {
  imageBuffer: Buffer;
  mimeType: string;
  userTier: SubscriptionTier;
  mode?: 'printed' | 'handwritten';
  timeoutMs?: number;
}

async function optimizeImageForOcr(imageBuffer: Buffer, mimeType: string) {
  const isLikelyOptimized =
    imageBuffer.length <= OCR_SPACE_SAFE_BYTES &&
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimeType.toLowerCase());

  if (isLikelyOptimized) {
    return { imageBuffer, mimeType };
  }

  try {
    const base = sharp(imageBuffer, { animated: false })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalise();

    for (const quality of [82, 72, 62, 52, 42, 34]) {
      const nextBuffer = await base.jpeg({ quality, mozjpeg: true }).toBuffer();
      if (nextBuffer.length <= OCR_SPACE_SAFE_BYTES || quality === 34) {
        return { imageBuffer: nextBuffer, mimeType: 'image/jpeg' };
      }
    }
  } catch (error) {
    console.warn('OCR image optimization failed, using original image:', error);
  }

  return { imageBuffer, mimeType };
}

async function readGatewayJson(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return { error: await res.text() };
}

export async function performOcr({
  imageBuffer,
  mimeType,
  userTier,
  mode: requestedMode,
  timeoutMs = 30000,
}: OcrRequest): Promise<OcrResult> {
  const mode = requestedMode || (userTier === 'FREE' ? 'printed' : 'handwritten');
  const optimized = await optimizeImageForOcr(imageBuffer, mimeType);
  const imageBase64 = optimized.imageBuffer.toString('base64');
  const modes: Array<'printed' | 'handwritten'> =
    mode === 'handwritten' ? ['handwritten', 'printed'] : ['printed', 'handwritten'];
  let lastError: unknown;

  for (let index = 0; index < modes.length; index++) {
    const attemptMode = modes[index];
    const budgetKey = attemptMode === 'handwritten' ? 'gemini' : 'ocrSpace';
    const budget = await checkProviderDailyLimit(budgetKey);
    if (!budget.success) {
      lastError = new Error(`${budgetKey} ka platform free daily budget complete ho gaya.`);
      continue;
    }

    try {
      const res = await fetch(`${GATEWAY_URL}/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GATEWAY_SECRET}` },
        body: JSON.stringify({
          mode: attemptMode,
          imageBase64,
          mimeType: optimized.mimeType,
          strict_provider: true,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      const data = await readGatewayJson(res);
      if (!res.ok) {
        lastError = new Error(data.error || `OCR gateway request failed (${res.status})`);
        continue;
      }

      const text = String(data.text || '').trim();
      if (!text) {
        lastError = new Error('OCR gateway returned empty text.');
        continue;
      }
      return {
        text,
        provider: data.providerUsed === 'gemini-vision' ? 'gemini-vision' : 'ocr-space',
        fallbackTriggered: index > 0,
      };
    } catch (error) {
      lastError = error;
    }
  }

  console.error('OCR failed on all budgeted providers:', lastError);
  throw lastError instanceof Error ? lastError : new Error('OCR failed on all providers');
}

export function validateOcrFile(mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  const MAX_SIZE = 4 * 1024 * 1024; // Leaves room under Vercel Hobby's multipart body cap.
  if (!mimeType.startsWith('image/')) return { valid: false, error: 'Sirf image upload karo' };
  if (sizeBytes > MAX_SIZE) return { valid: false, error: 'File 4MB se choti honi chahiye' };
  return { valid: true };
}
