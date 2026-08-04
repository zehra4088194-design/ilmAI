import 'server-only';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
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

export async function listPresentationBackgrounds(): Promise<PresentationBackground[]> {
  await mkdir(ROOT, { recursive: true });
  const entries = await readdir(ROOT, { withFileTypes: true });
  const results = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && safeName(entry.name))
      .map(async (entry) => {
        const data = await readFile(path.join(ROOT, entry.name));
        return { name: entry.name, url: `/api/presentation/backgrounds/${entry.name}`, size: data.byteLength };
      })
  );
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function savePresentationBackground(file: File): Promise<PresentationBackground> {
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
  await writeFile(path.join(ROOT, name), bytes, { flag: 'wx' });
  return { name, url: `/api/presentation/backgrounds/${name}`, size: bytes.byteLength };
}

export async function deletePresentationBackground(name: string) {
  const validName = safeName(name);
  if (!validName) throw new Error('Invalid background name.');
  await unlink(path.join(ROOT, validName));
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
