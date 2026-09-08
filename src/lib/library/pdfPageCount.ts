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
  const response = await fetch(resolveDirectDownloadUrl(fileUrl));
  if (!response.ok) return null;
  const buffer = await response.arrayBuffer();
  // A normal Drive "view" link resolved above still lands on an HTML interstitial for a file
  // Drive can't virus-scan (mainly larger files) instead of the bytes themselves — bail out to
  // the "couldn't read this file yet" path rather than handing pdf-lib an HTML page to choke on.
  const looksLikeHtml = new TextDecoder().decode(buffer.slice(0, 15)).trim().toLowerCase().startsWith('<!doctype');
  return looksLikeHtml ? null : buffer;
}

// GoogleDriveResourceCard resources store a normal share link (.../file/d/<id>/view or
// .../open?id=<id>), which — unlike our own R2 storage — serves an HTML viewer page to a plain
// fetch(), not the PDF's bytes. Rewritten to Drive's direct-download endpoint, a plain fetch gets
// the actual file for anything reasonably small (the case for exam notes/MCQ PDFs); this is a
// no-op for any URL that isn't a Drive share link (our own storage URLs, or an already-direct one).
function resolveDirectDownloadUrl(fileUrl: string): string {
  if (!/drive\.google\.com/i.test(fileUrl)) return fileUrl;
  const fileId = fileUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] || fileUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
  return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : fileUrl;
}
