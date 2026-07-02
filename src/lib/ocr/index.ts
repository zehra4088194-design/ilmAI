// ============================================
// UNIFIED OCR SERVICE — routes through the Cloudflare Worker gateway
// - 'printed'     -> OCR.space (5 keys, rotated) — used for FREE tier
// - 'handwritten' -> Gemini Vision (5 keys, rotated) — used for PRO/ELITE tier
// Each mode automatically falls back to the other if all 5 of its keys fail,
// so OCR practically never hard-fails.
// ============================================
import type { SubscriptionTier } from '@/types';

const GATEWAY_URL = process.env.AI_GATEWAY_URL || 'https://studyverse-ai1.noorhusnain791.workers.dev';
const GATEWAY_SECRET = process.env.AI_GATEWAY_SECRET || '';

export interface OcrResult {
  text: string;
  provider: 'ocr-space' | 'gemini-vision';
  fallbackTriggered?: boolean;
}

export interface OcrRequest {
  imageBuffer: Buffer;
  mimeType: string;
  userTier: SubscriptionTier;
}

export const OCR_FREE_DAILY_LIMIT = 5;

export async function performOcr({ imageBuffer, mimeType, userTier }: OcrRequest): Promise<OcrResult> {
  const mode = userTier === 'FREE' ? 'printed' : 'handwritten';
  const imageBase64 = imageBuffer.toString('base64');

  const res = await fetch(`${GATEWAY_URL}/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GATEWAY_SECRET}` },
    body: JSON.stringify({ mode, imageBase64, mimeType }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'OCR gateway request failed');

  return { text: (data.text || '').trim(), provider: data.providerUsed, fallbackTriggered: data.fallbackTriggered };
}

export function validateOcrFile(mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_SIZE = 8 * 1024 * 1024; // 8MB (base64 inflates ~33%, keep under provider limits)
  if (!ALLOWED_TYPES.includes(mimeType)) return { valid: false, error: 'Sirf JPG, PNG, WEBP, GIF images allowed hain' };
  if (sizeBytes > MAX_SIZE) return { valid: false, error: 'File 8MB se choti honi chahiye' };
  return { valid: true };
}
