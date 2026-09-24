// Addendum to bulk-upload-9th-library-resources.ts: E:\data\9th\text_books\*
// holds one full-book PDF per subject (no light/dark split, no per-chapter
// split) — catalog each as a single resource_type='text_book' row, chapter_id
// null (whole-book reference). Islamiat is intentionally excluded (skipped
// this round, same as the rest of the Islamiat content).
//
// Usage:
//   npx tsx --env-file=.env.local scripts/bulk-upload-9th-textbooks.ts --dry-run
//   npx tsx --env-file=.env.local scripts/bulk-upload-9th-textbooks.ts

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

const KEY_PREFIX = 'library/text-books/grade-9/';

const BOOKS: { folder: string; file: string; subjectSlug: string; subjectName: string }[] = [
  { folder: 'Pak.studies', file: 'New 9 Pak Study UM Full Book Punjab.pdf', subjectSlug: 'pakistan-studies', subjectName: 'Pakistan Studies' },
  { folder: 'T,T Quran', file: '9 TarjmaTulQuran Full Book Punjab.pdf', subjectSlug: 'tarjuma-tul-quran', subjectName: 'Tarjuma Tul Quran' },
  { folder: 'bio', file: 'New 9 Bio EM Full Book Punjab.pdf', subjectSlug: 'biology', subjectName: 'Biology' },
  { folder: 'che', file: 'New 9 Chemistry EM Full Book Punjab.pdf', subjectSlug: 'chemistry', subjectName: 'Chemistry' },
  { folder: 'com', file: 'New 9 Computer EM Full Book Punjab.pdf', subjectSlug: 'computer-science', subjectName: 'Computer Science' },
  { folder: 'english', file: 'New 9 English Full Book Punjab.pdf', subjectSlug: 'english', subjectName: 'English' },
  { folder: 'math', file: 'New 9 Math EM Full Book Punjab.pdf', subjectSlug: 'mathematics', subjectName: 'Mathematics' },
  { folder: 'phy', file: 'New 9 Physics EM Full Book Punjab.pdf', subjectSlug: 'physics', subjectName: 'Physics' },
  { folder: 'urdu', file: 'New 9 Urdu Full Book Punjab.pdf', subjectSlug: 'urdu', subjectName: 'Urdu' },
];

const ROOT = 'E:/data/9th/text_books';

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
    title: `${b.subjectName} — Class 9 Full Textbook (Punjab)`,
    book_title: `Class 9 ${b.subjectName} Textbook (Punjab)`,
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

  const manifestPath = path.join(process.cwd(), dryRun ? '9th-textbooks-manifest.dryrun.json' : '9th-textbooks-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log('Manifest written to:', manifestPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
