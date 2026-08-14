// Copies local files into E:/data/_ready-to-upload/<key> — mirroring the exact
// B2 object key each file is meant to have — so the user can upload the whole
// folder to the bucket root themselves (preserving structure) instead of this
// script doing the network upload.
//
// Usage:
//   npx tsx scripts/stage-for-manual-upload.ts <manifest.json> [notes|textbooks]
//   (mode defaults to "notes" — rows shaped like the *-library-manifest.json
//   files with dark_key/light_key/context_key/source.{dark,light,txt}.
//   "textbooks" mode is for the *-textbooks-manifest.json shape: key/source.)

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const STAGING_ROOT = 'E:/data/_ready-to-upload';

function stage(source: string, key: string) {
  if (!existsSync(source)) return false;
  const dest = path.join(STAGING_ROOT, key);
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(source, dest);
  return true;
}

function main() {
  const manifestPath = process.argv[2];
  const mode = process.argv[3] || 'notes';
  if (!manifestPath) {
    console.error('Usage: stage-for-manual-upload.ts <manifest.json> [notes|textbooks]');
    process.exit(1);
  }
  const rows = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let staged = 0;

  if (mode === 'textbooks') {
    for (const row of rows) {
      if (stage(row.source, row.key)) staged++;
    }
  } else {
    for (const row of rows) {
      if (row.dark_key && row.source.dark && stage(row.source.dark, row.dark_key)) staged++;
      if (row.light_key && row.light_key !== row.dark_key && row.source.light && stage(row.source.light, row.light_key)) staged++;
      if (row.context_key && row.source.txt && stage(row.source.txt, row.context_key)) staged++;
    }
  }

  console.log(`Staged ${staged} files from ${manifestPath} into ${STAGING_ROOT}`);
}

main();
