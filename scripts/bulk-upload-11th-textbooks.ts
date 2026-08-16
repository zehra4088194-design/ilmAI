// E:\data\11th\text_books\*  — one full-book PDF per subject, flat (no per-subject
// subfolders this time). Same pattern as bulk-upload-9th/10th-textbooks.ts.
// Islamiat intentionally excluded.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/bulk-upload-11th-textbooks.ts --dry-run
//   npx tsx --env-file=.env.local scripts/bulk-upload-11th-textbooks.ts

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

const KEY_PREFIX = 'library/text-books/grade-11/';

const BOOKS: { file: string; subjectSlug: string; subjectName: string }[] = [
  { file: 'New 11 Biology EM Full Book Punjab 2025.pdf', subjectSlug: 'biology', subjectName: 'Biology' },
  { file: 'New 11 Chemistry EM Full Book Punjab 2025.pdf', subjectSlug: 'chemistry', subjectName: 'Chemistry' },
  { file: 'New 11 Computer EM Full Book Punjab 2025.pdf', subjectSlug: 'computer-science', subjectName: 'Computer Science' },
  { file: 'New 11 English Full Book Punjab 2025.pdf', subjectSlug: 'english', subjectName: 'English' },
  { file: 'New 11 Islamiat UM Full Book Punjab 2025.pdf', subjectSlug: 'islamiat', subjectName: 'Islamiat' },
  { file: 'New 11 Maths EM Full Book Punjab 2025.pdf', subjectSlug: 'mathematics', subjectName: 'Mathematics' },
  { file: 'New 11 Physics EM Full Book Punjab 2025.pdf', subjectSlug: 'physics', subjectName: 'Physics' },
  { file: 'New 11 TTQ EM Full Book Punjab 2025.pdf', subjectSlug: 'tarjuma-tul-quran', subjectName: 'Tarjuma Tul Quran' },
  { file: 'New 11 Urdu Full Book Punjab 2025.pdf', subjectSlug: 'urdu', subjectName: 'Urdu' },
];

const ROOT = 'E:/data/11th/text_books';

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

type Row = {
  subject_slug: string;
  title: string;
  book_title: string;
  key: string;
  source: string;
};

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const rows: Row[] = BOOKS.map((b) => ({
    subject_slug: b.subjectSlug,
    title: `${b.subjectName} — Class 11 Full Textbook (Punjab)`,
    book_title: `Class 11 ${b.subjectName} Textbook (Punjab)`,
    key: `${KEY_PREFIX}${slugify(b.subjectSlug)}-full-textbook.pdf`,
    source: path.join(ROOT, b.file),
  }));

  console.log(`Discovered ${rows.length} textbooks.${dryRun ? ' (DRY RUN)' : ''}`);
  rows.forEach((r) => console.log(' -', r.title));

  if (!dryRun) {
    for (const row of rows) {
      await putR2Object(row.key, readFileSync(row.source), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, process.env.SECONDARY_STORAGE_BUCKET);
      console.log('  uploaded:', row.key);
    }
  }

  const manifestPath = path.join(process.cwd(), dryRun ? '11th-textbooks-manifest.dryrun.json' : '11th-textbooks-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log('Manifest written to:', manifestPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
