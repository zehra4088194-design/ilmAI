import 'server-only';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const ROOT = process.env.PRESENTATION_ASSETS_PATH || path.join(process.cwd(), 'data', 'presentation-assets');
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

import type { PresentationBackground } from './types';

function safeName(value: string) {
  const name = path.basename(value);
  return /^[a-z0-9][a-z0-9-]*\.(?:jpg|png|webp)$/i.test(name) ? name : null;
}

function cleanText(value: unknown, max = 100) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanKeywords(value: unknown) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(values.map((item) => cleanText(item, 60).toLowerCase()).filter(Boolean))].slice(0, 30);
}

function metadataPath(name: string) {
  return path.join(ROOT, `${name}.json`);
}

async function readMetadata(name: string) {
  try {
    const parsed = JSON.parse(await readFile(metadataPath(name), 'utf8')) as Record<string, unknown>;
    return {
      subject: cleanText(parsed.subject, 100),
      keywords: cleanKeywords(parsed.keywords),
      isGlobal: parsed.isGlobal === true,
    };
  } catch {
    return { subject: '', keywords: [], isGlobal: false };
  }
}

export async function listPresentationBackgrounds(): Promise<PresentationBackground[]> {
  await mkdir(ROOT, { recursive: true });
  const entries = await readdir(ROOT, { withFileTypes: true });
  const results = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && safeName(entry.name))
      .map(async (entry) => {
        const [details, metadata] = await Promise.all([stat(path.join(ROOT, entry.name)), readMetadata(entry.name)]);
        return {
          name: entry.name,
          url: `/api/presentation/backgrounds/${entry.name}`,
          size: details.size,
          ...metadata,
        };
      })
  );
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function savePresentationBackground(
  file: File,
  metadata: { subject?: string; keywords?: string[]; isGlobal?: boolean } = {}
): Promise<PresentationBackground> {
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension) throw new Error('Only JPG, PNG, and WebP images are allowed.');
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw new Error('Each image must be 10 MB or smaller.');

  await mkdir(ROOT, { recursive: true });
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
    isGlobal: metadata.isGlobal === true,
  };
  await writeFile(path.join(ROOT, name), bytes, { flag: 'wx' });
  await writeFile(metadataPath(name), JSON.stringify(storedMetadata), { flag: 'wx' });
  return { name, url: `/api/presentation/backgrounds/${name}`, size: bytes.byteLength, ...storedMetadata };
}

export async function deletePresentationBackground(name: string) {
  const validName = safeName(name);
  if (!validName) throw new Error('Invalid background name.');
  await unlink(path.join(ROOT, validName));
  await unlink(metadataPath(validName)).catch(() => undefined);
}

export async function readPresentationBackground(name: string) {
  const validName = safeName(name);
  if (!validName) return null;
  try {
    return { name: validName, data: await readFile(path.join(ROOT, validName)) };
  } catch {
    return null;
  }
}

export function presentationBackgroundNameFromUrl(url?: string) {
  if (!url) return null;
  const match = url.match(/^\/api\/presentation\/backgrounds\/([^/?#]+)$/);
  return match ? safeName(decodeURIComponent(match[1]!)) : null;
}
