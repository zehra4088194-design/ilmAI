// ============================================
// OCR.SPACE (Free tier fallback)
// Free plan: 25,000 requests/month BUT rate-limited to ~5 requests/day
// per the API key tier we use ("Free" key = 500 req/day shared pool,
// here we enforce a per-USER 5/day cap ourselves — see rate-limit below).
// Docs: https://ocr.space/ocrapi
// ============================================
import type { OcrResult } from './google-vision';

const OCR_SPACE_URL = 'https://api.ocr.space/parse/image';

interface OcrSpaceResponse {
  ParsedResults?: { ParsedText: string; TextOverlay?: { Lines: unknown[] } }[];
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string | string[];
}

/**
 * Extract text from an image using the OCR.space free API.
 * Best for: free-tier users, clean printed text, lower accuracy on handwriting.
 * NOTE: 5 requests/day per user is enforced via lib/rate-limit, not by this function.
 */
export async function ocrWithOcrSpace(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
  const apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld'; // 'helloworld' = public demo key, low limits

  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType });
  formData.append('file', blob, 'scan.jpg');
  formData.append('apikey', apiKey);
  formData.append('language', 'eng'); // OCR.space free tier: 'eng' is most reliable; 'urd' supported on some keys
  formData.append('OCREngine', '2'); // Engine 2 = better accuracy for documents
  formData.append('scale', 'true');
  formData.append('detectOrientation', 'true');

  const response = await fetch(OCR_SPACE_URL, { method: 'POST', body: formData });

  if (!response.ok) {
    throw new Error(`OCR.space request failed: ${response.status}`);
  }

  const data: OcrSpaceResponse = await response.json();

  if (data.IsErroredOnProcessing) {
    const msg = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(', ') : data.ErrorMessage;
    throw new Error(msg || 'OCR.space processing error');
  }

  const text = data.ParsedResults?.[0]?.ParsedText?.trim() || '';

  return {
    text,
    confidence: text.length > 0 ? 0.75 : 0, // OCR.space doesn't return a numeric confidence
    provider: 'ocr-space',
  };
}
