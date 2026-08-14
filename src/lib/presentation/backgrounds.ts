import 'server-only';
import { randomUUID } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { deleteR2Object, getR2Object, isR2Configured, putR2Object } from '@/lib/storage/r2';

// Image bytes live in the shared B2 (R2-compatible) object storage bucket under the
// `presentation-backgrounds/` prefix. Metadata (subject, keywords, category, isGlobal,
// the B2 key, size) lives in the public.presentation_backgrounds Supabase table, so the
// name/category/URL is looked up from Supabase while the actual file is downloaded from
// B2 on demand — both at admin-preview time (via the proxy route) and when a
// presentation is exported (pptx-export.ts calls readPresentationBackground directly).
const B2_PREFIX = 'presentation-backgrounds/';
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

import type { PresentationBackground } from './types';

type BackgroundRow = {
  storage_path: string;
  subject: string;
  keywords: string[];
  category: string;
  mode: string;
  is_global: boolean;
  size_bytes: number;
};

function safeName(value: string) {
  const name = value.split('/').pop() || '';
  return /^[a-z0-9][a-z0-9-]*\.(?:jpg|png|webp)$/i.test(name) ? name : null;
}

function cleanText(value: unknown, max = 100) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanKeywords(value: unknown) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(values.map((item) => cleanText(item, 60).toLowerCase()).filter(Boolean))].slice(0, 30);
}

// Older sidecar files never had a category. Defaulting a missing/blank value to
// 'uncategorized' keeps every reader (matching, admin UI) backward-compatible.
function cleanCategory(value: unknown) {
  const cleaned = cleanText(value, 40).toLowerCase();
  return cleaned || 'uncategorized';
}

// Every background predates 'mode' having a value other than 'dark' — that was
// the only visual treatment (dark scrim + white text) applied before the
// dark/light theme split, so anything else defaults to it too.
function cleanMode(value: unknown) {
  return value === 'light' ? 'light' : 'dark';
}

function toBackground(row: BackgroundRow): PresentationBackground {
  return {
    name: row.storage_path,
    url: `/api/presentation/backgrounds/${row.storage_path}`,
    size: row.size_bytes,
    subject: row.subject,
    keywords: row.keywords,
    category: row.category,
    mode: cleanMode(row.mode),
    isGlobal: row.is_global,
  };
}

export async function listPresentationBackgrounds(): Promise<PresentationBackground[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('presentation_backgrounds')
    .select('storage_path, subject, keywords, category, mode, is_global, size_bytes')
    .order('storage_path', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as BackgroundRow[]).map(toBackground);
}

export async function savePresentationBackground(
  file: File,
  metadata: { subject?: string; keywords?: string[]; category?: string; mode?: string; isGlobal?: boolean } = {}
): Promise<PresentationBackground> {
  if (!isR2Configured()) throw new Error('Object storage is not configured (missing OBJECT_STORAGE_* env vars).');
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension) throw new Error('Only JPG, PNG, and WebP images are allowed.');
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw new Error('Each image must be 10 MB or smaller.');

  const stem = file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'background';
  const name = `${stem}-${randomUUID().slice(0, 8)}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const storedMetadata = {
    subject: cleanText(metadata.subject, 100),
    keywords: cleanKeywords(metadata.keywords),
    category: cleanCategory(metadata.category),
    mode: cleanMode(metadata.mode),
    isGlobal: metadata.isGlobal === true,
  };

  await putR2Object(`${B2_PREFIX}${name}`, bytes, { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' });

  const supabase = createServiceClient();
  const { error: insertError } = await supabase.from('presentation_backgrounds').insert({
    storage_path: name,
    subject: storedMetadata.subject,
    keywords: storedMetadata.keywords,
    category: storedMetadata.category,
    mode: storedMetadata.mode,
    is_global: storedMetadata.isGlobal,
    size_bytes: bytes.byteLength,
  });
  if (insertError) {
    await deleteR2Object(`${B2_PREFIX}${name}`).catch(() => undefined);
    throw new Error(insertError.message);
  }

  return { name, url: `/api/presentation/backgrounds/${name}`, size: bytes.byteLength, ...storedMetadata };
}

export async function deletePresentationBackground(name: string) {
  const validName = safeName(name);
  if (!validName) throw new Error('Invalid background name.');
  await deleteR2Object(`${B2_PREFIX}${validName}`);
  const supabase = createServiceClient();
  await supabase.from('presentation_backgrounds').delete().eq('storage_path', validName);
}

export async function readPresentationBackground(name: string) {
  const validName = safeName(name);
  if (!validName) return null;
  const object = await getR2Object(`${B2_PREFIX}${validName}`);
  if (!object) return null;
  return { name: validName, data: Buffer.from(object.body) };
}

export function presentationBackgroundNameFromUrl(url?: string) {
  if (!url) return null;
  const match = url.match(/^\/api\/presentation\/backgrounds\/([^/?#]+)$/);
  return match ? safeName(decodeURIComponent(match[1]!)) : null;
}
