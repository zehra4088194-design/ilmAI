// E:\data\10th\text-books\*  — one full-book PDF per subject (no light/dark
// split, no per-chapter split). Same pattern as bulk-upload-9th-textbooks.ts.
// Islamiat intentionally excluded (skipped this round, same as rest of Islamiat content).
//
// Usage:
//   npx tsx --env-file=.env.local scripts/bulk-upload-10th-textbooks.ts --dry-run
//   npx tsx --env-file=.env.local scripts/bulk-upload-10th-textbooks.ts

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

const KEY_PREFIX = 'library/text-books/grade-10/';

const BOOKS: { folder: string; file: string; subjectSlug: string; subjectName: string }[] = [
  { folder: 'Biology', file: 'New 10 Biology EM Full Book Punjab 2026.pdf', subjectSlug: 'biology', subjectName: 'Biology' },
  { folder: 'Chemistry', file: 'New 10 Chemistry EM Full Book Punjab 2026.pdf', subjectSlug: 'chemistry', subjectName: 'Chemistry' },
  { folder: 'Computer', file: 'New 10 Computer EM Full Book Punjab 2026.pdf', subjectSlug: 'computer-science', subjectName: 'Computer Science' },
  { folder: 'English', file: 'New 10 English Full Book Punjab 2026.pdf', subjectSlug: 'english', subjectName: 'English' },
  { folder: 'Mathematics', file: 'New 10 Maths EM Full Book Punjab 2026.pdf', subjectSlug: 'mathematics', subjectName: 'Mathematics' },
  { folder: 'Pak Studies', file: 'New 10 Pak Studies UM Full Book Punjab 2026.pdf', subjectSlug: 'pakistan-studies', subjectName: 'Pakistan Studies' },
  { folder: 'Physics', file: 'New 10 Physics EM Full Book Punjab 2026.pdf', subjectSlug: 'physics', subjectName: 'Physics' },
  { folder: 'Tarjuma Tul Quran', file: '10 TarjmaTulQuran Full Book Punjab.pdf', subjectSlug: 'tarjuma-tul-quran', subjectName: 'Tarjuma Tul Quran' },
  { folder: 'Urdu', file: 'New 10 Urdu Full Book Punjab 2026.pdf', subjectSlug: 'urdu', subjectName: 'Urdu' },
];

const ROOT = 'E:/data/10th/text-books';

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
    title: `${b.subjectName} — Class 10 Full Textbook (Punjab)`,
    book_title: `Class 10 ${b.subjectName} Textbook (Punjab)`,
    key: `${KEY_PREFIX}${slugify(b.subjectSlug)}-full-textbook.pdf`,
    source: path.join(ROOT, b.folder, b.file),
  }));

  console.log(`Discovered ${rows.length} textbooks.${dryRun ? ' (DRY RUN)' : ''}`);
  rows.forEach((r) => console.log(' -', r.title));

  if (!dryRun) {
    for (const row of rows) {
      await putR2Object(row.key, readFileSync(row.source), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' });
      console.log('  uploaded:', row.key);
    }
  }

  const manifestPath = path.join(process.cwd(), dryRun ? '10th-textbooks-manifest.dryrun.json' : '10th-textbooks-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log('Manifest written to:', manifestPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
