import { PDFDocument } from 'pdf-lib';
import { getR2Object, parseR2Uri } from '@/lib/storage/r2';

/**
 * Fetches a library resource's PDF bytes (from our own R2/B2 storage, or a plain https URL as a
 * fallback for legacy rows) and counts its pages with pdf-lib. Everything happens in memory —
 * nothing is ever written to disk here, so there is no temp file to clean up afterward; the bytes
 * are simply garbage-collected once this function returns. Callers should cache the result
 * (library_resources.page_count) so this never has to re-download the same file twice.
 */
export async function countPdfPages(fileUrl: string): Promise<number | null> {
  try {
    const bytes = await fetchPdfBytes(fileUrl);
    if (!bytes) return null;
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const count = doc.getPageCount();
    return count > 0 ? count : null;
  } catch {
    return null;
  }
}

async function fetchPdfBytes(fileUrl: string): Promise<ArrayBuffer | null> {
  const r2Uri = parseR2Uri(fileUrl);
  if (r2Uri) {
    const object = await getR2Object(r2Uri.key, r2Uri.bucket);
    return object?.body ?? null;
  }
  if (!/^https?:\/\//i.test(fileUrl)) return null;
  const response = await fetch(fileUrl);
  if (!response.ok) return null;
  return response.arrayBuffer();
}
