// One-off admin script: bulk-upload a locally pre-organized folder of
// presentation background images straight into the B2 (R2-compatible) object
// storage bucket the app already uses (src/lib/storage/r2.ts) — same bucket,
// same key prefix, same filename convention as the admin-panel upload path
// (src/lib/presentation/backgrounds.ts), so the app can serve these exactly
// like any admin-uploaded background once matching Supabase rows exist.
//
// This script ONLY touches B2. It deliberately does NOT touch Supabase — it
// prints a ready-to-paste manifest (JSON) of every uploaded file + derived
// metadata so a second step (e.g. a separate Claude session with Supabase MCP
// connected) can insert the public.presentation_backgrounds rows.
//
// Expected input layout:
//   <root>/<CategoryFolder>/<dark|light>/[optional nested subfolder/]*.png
//   <root>/_Generic_Universal/*.png   (topic-agnostic, marked isGlobal)
//
// Usage:
//   node --env-file=.env.local --experimental-strip-types scripts/bulk-upload-presentation-backgrounds.ts <root> --dry-run
//   node --env-file=.env.local --experimental-strip-types scripts/bulk-upload-presentation-backgrounds.ts <root>
//
// (Run via `npx tsx` also works and does not need --experimental-strip-types.)

import { randomUUID } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { putPresentationR2Object as putR2Object } from '../src/lib/storage/presentation-r2';

const MIME_EXTENSIONS: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const B2_PREFIX = 'presentation-backgrounds/';
const CONCURRENCY = 6;

type Row = {
  storage_path: string;
  url: string;
  subject: string;
  category: string;
  keywords: string[];
  mode: 'dark' | 'light';
  is_global: boolean;
  size_bytes: number;
  source_file: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function safeStem(value: string, max = 48) {
  return (
    slugify(value)
      .slice(0, max)
      .replace(/^-|-$/g, '') || 'background'
  );
}

function extractKeywords(basenameNoExt: string, stripWords: Set<string>) {
  return [
    ...new Set(
      basenameNoExt
        .split(/[_\-\s]+/)
        .map((token) => token.toLowerCase())
        .filter((token) => token.length > 1 && !/^\d+$/.test(token) && !stripWords.has(token))
    ),
  ].slice(0, 30);
}

async function collectImageFiles(root: string): Promise<{ absPath: string; relParts: string[] }[]> {
  const results: { absPath: string; relParts: string[] }[] = [];
  async function walk(dir: string, relParts: string[]) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs, [...relParts, entry.name]);
      } else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) {
        results.push({ absPath: abs, relParts: [...relParts, entry.name] });
      }
    }
  }
  await walk(root, []);
  return results;
}

function deriveMetadata(relParts: string[]): { subject: string; category: string; mode: 'dark' | 'light'; isGlobal: boolean; keywordExtras: string[] } {
  const topFolder = relParts[0]!;
  const basenameNoExt = relParts[relParts.length - 1]!.replace(/\.[^.]+$/, '');

  if (topFolder === '_Generic_Universal') {
    return { subject: '', category: 'abstract', mode: 'dark', isGlobal: true, keywordExtras: [] };
  }

  const subject = topFolder.replace(/_/g, ' ').trim();
  const category = slugify(subject);
  const modeFolder = relParts.find((part) => part.toLowerCase() === 'dark' || part.toLowerCase() === 'light');
  const mode: 'dark' | 'light' = modeFolder?.toLowerCase() === 'light' ? 'light' : 'dark';
  // A nested subfolder between the mode folder and the file (e.g. .../dark/photosynthesis/x.png)
  // is a strong topic-specific keyword — surface it even though extractKeywords()
  // already picks it up from matching filename prefixes in most cases.
  const modeIndex = relParts.findIndex((part) => part.toLowerCase() === mode);
  const nestedFolders = modeIndex >= 0 ? relParts.slice(modeIndex + 1, -1) : [];
  const keywordExtras = nestedFolders.map((f) => f.toLowerCase());

  return { subject, category, mode, isGlobal: false, keywordExtras };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]!, index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const root = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

  if (!root) {
    console.error('Usage: bulk-upload-presentation-backgrounds <root-dir> [--dry-run] [--limit=N]');
    process.exit(1);
  }

  const files = await collectImageFiles(root);
  const toProcess = files.slice(0, Number.isFinite(limit) ? limit : files.length);
  console.log(`Found ${files.length} image files under ${root}. Processing ${toProcess.length}.${dryRun ? ' (DRY RUN — no upload)' : ''}`);

  let ok = 0;
  let failed = 0;
  const rows: Row[] = [];
  const errors: { file: string; error: string }[] = [];

  const outputs = await mapWithConcurrency(toProcess, CONCURRENCY, async ({ absPath, relParts }) => {
    try {
      const ext = path.extname(absPath).toLowerCase();
      const contentType = MIME_EXTENSIONS[ext];
      if (!contentType) throw new Error(`Unsupported extension: ${ext}`);

      const meta = deriveMetadata(relParts);
      const basenameNoExt = relParts[relParts.length - 1]!.replace(/\.[^.]+$/, '');
      const stripWords = new Set([
        ...meta.subject.toLowerCase().split(/\s+/).filter(Boolean),
        meta.mode,
        'light',
        'dark',
      ]);
      const keywords = [...new Set([...extractKeywords(basenameNoExt, stripWords), ...meta.keywordExtras])].slice(0, 30);

      const basenameSlug = slugify(basenameNoExt);
      const stemParts = [
        basenameSlug.startsWith(meta.category) ? null : meta.category || 'general',
        basenameSlug.includes(meta.mode) ? null : meta.mode,
        basenameSlug,
      ].filter(Boolean) as string[];
      const stem = safeStem(stemParts.join('-'));
      const extension = ext === '.jpeg' ? 'jpg' : ext.slice(1);
      const storageName = `${stem}-${randomUUID().slice(0, 8)}.${extension}`;
      const key = `${B2_PREFIX}${storageName}`;

      const bytes = await readFile(absPath);
      const stats = await stat(absPath);

      if (!dryRun) {
        await putR2Object(key, bytes, { contentType, cacheControl: 'public, max-age=31536000, immutable' });
      }

      const row: Row = {
        storage_path: storageName,
        url: `/api/presentation/backgrounds/${storageName}`,
        subject: meta.subject,
        category: meta.category,
        keywords,
        mode: meta.mode,
        is_global: meta.isGlobal,
        size_bytes: stats.size,
        source_file: relParts.join('/'),
      };
      ok++;
      return row;
    } catch (error) {
      failed++;
      errors.push({ file: relParts.join('/'), error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  });

  for (const row of outputs) if (row) rows.push(row);

  const manifestPath = path.join(process.cwd(), dryRun ? 'presentation-backgrounds-manifest.dryrun.json' : 'presentation-backgrounds-manifest.json');
  await writeFile(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), bucket: 'ilmai-presentations', prefix: B2_PREFIX, count: rows.length, rows }, null, 2));

  console.log(`\nDone. ok=${ok} failed=${failed}`);
  console.log(`Manifest written to: ${manifestPath}`);
  if (errors.length) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors.slice(0, 20)) console.log(`  ${e.file}: ${e.error}`);
    if (errors.length > 20) console.log(`  ...and ${errors.length - 20} more`);
  }

  const byCategory = new Map<string, number>();
  for (const row of rows) byCategory.set(`${row.category}/${row.mode}`, (byCategory.get(`${row.category}/${row.mode}`) || 0) + 1);
  console.log('\nBy category/mode:');
  for (const [key, count] of [...byCategory.entries()].sort()) console.log(`  ${key}: ${count}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
