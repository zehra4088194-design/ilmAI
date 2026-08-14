// E:\data\12th\text_books\*  — one full-book PDF per subject, flat. Same pattern
// as bulk-upload-9th/10th/11th-textbooks.ts. Islamiat not present in this folder
// (no file matched) so nothing to exclude explicitly, but would be skipped anyway
// per the user's standing instruction.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/bulk-upload-12th-textbooks.ts --dry-run
//   npx tsx --env-file=.env.local scripts/bulk-upload-12th-textbooks.ts

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

const KEY_PREFIX = 'library/text-books/grade-12/';

const BOOKS: { file: string; subjectSlug: string; subjectName: string }[] = [
  { file: '12 Biology Full Book Punjab EM.pdf', subjectSlug: 'biology', subjectName: 'Biology' },
  { file: '12 Chemistry Full Book Punjab EM.pdf', subjectSlug: 'chemistry', subjectName: 'Chemistry' },
  { file: '12 Computer Full Book Punjab EM.pdf', subjectSlug: 'computer-science', subjectName: 'Computer Science' },
  { file: '12 Maths Full Book Punjab EM.pdf', subjectSlug: 'mathematics', subjectName: 'Mathematics' },
  { file: '12 Pak Study Full Book Punjab EM.pdf', subjectSlug: 'pakistan-studies', subjectName: 'Pakistan Studies' },
  { file: '12 Physics Full Book Punjab EM.pdf', subjectSlug: 'physics', subjectName: 'Physics' },
  { file: '2343-12th-class-tarjuma-tul-quran-latest-textbook-pdf-(taleem360.com)-VD1Cs.pdf', subjectSlug: 'tarjuma-tul-quran', subjectName: 'Tarjuma Tul Quran' },
  { file: 'New 12 English Full Book Punjab 2026.pdf', subjectSlug: 'english', subjectName: 'English' },
  { file: 'New 12 Urdu Full Book Punjab 2026.pdf', subjectSlug: 'urdu', subjectName: 'Urdu' },
];

const ROOT = 'E:/data/12th/text_books';

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
    title: `${b.subjectName} — Class 12 Full Textbook (Punjab)`,
    book_title: `Class 12 ${b.subjectName} Textbook (Punjab)`,
    key: `${KEY_PREFIX}${slugify(b.subjectSlug)}-full-textbook.pdf`,
    source: path.join(ROOT, b.file),
  }));

  console.log(`Discovered ${rows.length} textbooks.${dryRun ? ' (DRY RUN)' : ''}`);
  rows.forEach((r) => console.log(' -', r.title));

  if (!dryRun) {
    for (const row of rows) {
      await putR2Object(row.key, readFileSync(row.source), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' });
      console.log('  uploaded:', row.key);
    }
  }

  const manifestPath = path.join(process.cwd(), dryRun ? '12th-textbooks-manifest.dryrun.json' : '12th-textbooks-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log('Manifest written to:', manifestPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
