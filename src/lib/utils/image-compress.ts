'use client';
// ============================================
// IMAGE COMPRESSION — runs in the browser before OCR upload
// Shrinks large photos to ≤1400px on longest side, JPEG at 85% quality.
// This keeps uploads efficient for self-hosted OCR and Gemini fallback,
// Gemini Vision = 20MB) without the user having to think about it.
// ============================================

export interface CompressedImage {
  blob: Blob;
  base64: string;          // for direct API calls
  mimeType: 'image/jpeg';
  originalName: string;
  originalSizeKB: number;
  compressedSizeKB: number;
}

export async function compressImageForOcr(file: File, maxDimension = 1400, quality = 0.85): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const scale = Math.min(maxDimension / Math.max(img.width, img.height), 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error('Canvas context unavailable')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);

      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Canvas to blob failed')); return; }
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1] ?? '';
          resolve({
            blob,
            base64,
            mimeType: 'image/jpeg',
            originalName: file.name,
            originalSizeKB: Math.round(file.size / 1024),
            compressedSizeKB: Math.round(blob.size / 1024),
          });
        };
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      }, 'image/jpeg', quality);
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.src = objectUrl;
  });
}

/** Quick guard — rejects before attempting any network call */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_MB = 10;
  if (!ALLOWED.includes(file.type)) return { valid: false, error: 'Upload a JPG, PNG, WEBP, or GIF file.' };
  if (file.size > MAX_MB * 1024 * 1024) return { valid: false, error: `The file must be smaller than ${MAX_MB} MB.` };
  return { valid: true };
}
