import 'server-only';
import { randomUUID } from 'node:crypto';
import { deleteR2Object, getR2Object, isR2Configured, putR2Object } from '@/lib/storage/r2';

// Banner creatives live in the shared B2 (R2-compatible) object storage bucket under the
// `house-ads/` prefix — same wrapper the presentation-backgrounds and audio-library admin
// tools already use. Unlike those, banner images must render for logged-out visitors too
// (library/past-papers are public pages), so they're served through an unauthenticated
// proxy route rather than one gated behind an admin session.
const B2_PREFIX = 'house-ads/';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function safeKey(key: string) {
  return /^[a-z0-9-]+\.(?:jpg|png|webp|gif)$/i.test(key) ? key : null;
}

export function adBannerImageUrl(key: string) {
  return `/api/ads/image/${key}`;
}

export function adBannerImageKeyFromUrl(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(/^\/api\/ads\/image\/([^/?#]+)$/);
  return match ? safeKey(decodeURIComponent(match[1]!)) : null;
}

export async function saveAdBannerImage(file: File) {
  if (!isR2Configured()) throw new Error('Object storage is not configured (missing OBJECT_STORAGE_* env vars).');
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension) throw new Error('Only JPG, PNG, WebP, and GIF images are allowed.');
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw new Error('The banner image must be 5 MB or smaller.');

  const key = `${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await putR2Object(`${B2_PREFIX}${key}`, bytes, {
    contentType: file.type,
    cacheControl: 'public, max-age=31536000, immutable',
  });
  return { key, url: adBannerImageUrl(key), size: bytes.byteLength };
}

export async function readAdBannerImage(key: string) {
  const validKey = safeKey(key);
  if (!validKey) return null;
  const object = await getR2Object(`${B2_PREFIX}${validKey}`);
  if (!object) return null;
  return { key: validKey, data: Buffer.from(object.body), contentType: object.contentType };
}

export async function deleteAdBannerImage(url: string | null | undefined) {
  const key = adBannerImageKeyFromUrl(url);
  if (!key) return;
  await deleteR2Object(`${B2_PREFIX}${key}`).catch(() => undefined);
}
