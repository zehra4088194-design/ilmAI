// One-off admin script: bulk-upload pairing_scheme PDFs (grades 9-12) into B2
// and catalog them in public.library_resources as resource_type='pairing_scheme'.
// These are whole-subject, whole-grade documents — no chapter_id, no txt.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/bulk-upload-pairing-schemes.ts --dry-run
//   npx tsx --env-file=.env.local scripts/bulk-upload-pairing-schemes.ts

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

const KEY_PREFIX = 'library/pairing-schemes/';

const SUBJECT_IDS: Record<string, string> = {
  biology: '0af743bf-d092-4560-a91b-93b63dc4a7f4',
  chemistry: '4d116283-9f21-41f9-a963-150f8ceec665',
  'computer-science': 'e97c5d3b-85ae-47c9-befe-e4936b4b7d30',
  english: '606c9192-1fe6-469d-887f-274d9b4caf06',
  islamiat: 'dafd0504-d665-44ab-b7d2-3db8a95f4fd1',
  mathematics: 'd8723997-66a7-4479-9476-007d1966c6b0',
  'pakistan-studies': '09b5a663-27db-42a9-94fc-01de6694a58c',
  physics: 'b9223153-db12-415c-a533-311903e62f13',
  'tarjuma-tul-quran': '0d776870-3900-4bca-83ae-ec081d1ab087',
  urdu: '6e4f47c7-4a56-4773-a18d-d8408a9399ed',
};

const SUBJECT_NAMES: Record<string, string> = {
  biology: 'Biology',
  chemistry: 'Chemistry',
  'computer-science': 'Computer Science',
  english: 'English',
  islamiat: 'Islamiat',
  mathematics: 'Mathematics',
  'pakistan-studies': 'Pakistan Studies',
  physics: 'Physics',
  'tarjuma-tul-quran': 'Tarjuma Tul Quran',
  urdu: 'Urdu',
};

// Filenames vary by grade folder (Biology_9th_Dark.pdf, "Biology - 10th Class
// Pairing Scheme 2026 (Dark).pdf", Biology_Dark.pdf, Islamiat_Lazmi_Dark.pdf,
// Pak_Studies_Dark.pdf, Tarjuma-tul-Quran.../Tarjuma_Tul_Quran...) — normalize
// by matching known tokens rather than assuming one fixed pattern.
function normalizeSubject(filename: string): string | null {
  const cleaned = filename.toLowerCase();
  if (cleaned.includes('computer')) return 'computer-science';
  if (cleaned.includes('tarjuma')) return 'tarjuma-tul-quran';
  if (cleaned.includes('pak') && (cleaned.includes('studies') || cleaned.includes('stud'))) return 'pakistan-studies';
  if (cleaned.includes('islamiat') || cleaned.includes('islamiyat')) return 'islamiat';
  if (cleaned.includes('biology')) return 'biology';
  if (cleaned.includes('chemistry')) return 'chemistry';
  if (cleaned.includes('english')) return 'english';
  if (cleaned.includes('math')) return 'mathematics';
  if (cleaned.includes('physics')) return 'physics';
  if (cleaned.includes('urdu')) return 'urdu';
  return null;
}

type Row = {
  subject_slug: string;
  grade: string;
  title: string;
  book_title: string;
  light_key: string;
  dark_key: string;
  source: { light?: string; dark?: string };
};

const GRADES: { folder: string; grade: string; label: string }[] = [
  { folder: 'E:/data/9th/pairing_scheme', grade: 'GRADE_9', label: '9' },
  { folder: 'E:/data/10th/pairing_scheme', grade: 'GRADE_10', label: '10' },
  { folder: 'E:/data/11th/pairing_scheme', grade: 'GRADE_11', label: '11' },
  { folder: 'E:/data/12th/pairing_scheme', grade: 'GRADE_12', label: '12' },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function discover(): Row[] {
  const rows: Row[] = [];
  for (const { folder, grade, label } of GRADES) {
    const darkDir = path.join(folder, 'dark');
    const lightDir = path.join(folder, 'light');
    if (!existsSync(darkDir)) continue;
    const darkFiles = readdirSync(darkDir);
    for (const darkFile of darkFiles) {
      const subjectSlug = normalizeSubject(darkFile);
      if (!subjectSlug) {
        console.warn(`  ! could not identify subject for: ${folder}/dark/${darkFile}`);
        continue;
      }
      // Light file: same subject token, "Dark" -> "Light" (case-insensitive, keep original casing style).
      const lightFile = darkFiles.length && existsSync(lightDir)
        ? readdirSync(lightDir).find((f) => normalizeSubject(f) === subjectSlug)
        : undefined;
      if (!lightFile) console.warn(`  ! no light variant found for ${subjectSlug} grade ${label}`);

      const keyBase = `${KEY_PREFIX}grade-${label}/${subjectSlug}-pairing-scheme`;
      rows.push({
        subject_slug: subjectSlug,
        grade,
        title: `${SUBJECT_NAMES[subjectSlug]} — Pairing Scheme (Class ${label})`,
        book_title: `Class ${label} ${SUBJECT_NAMES[subjectSlug]} Pairing Scheme`,
        dark_key: `${keyBase}.dark.pdf`,
        light_key: `${keyBase}.light.pdf`,
        source: {
          dark: path.join(darkDir, darkFile),
          light: lightFile ? path.join(lightDir, lightFile) : undefined,
        },
      });
    }
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const rows = discover();
  console.log(`Discovered ${rows.length} pairing schemes.${dryRun ? ' (DRY RUN)' : ''}`);
  const byGrade: Record<string, number> = {};
  for (const r of rows) byGrade[r.grade] = (byGrade[r.grade] || 0) + 1;
  console.log(byGrade);

  if (!dryRun) {
    let uploaded = 0;
    for (const row of rows) {
      const uploads: Promise<void>[] = [];
      if (row.source.dark) uploads.push(putR2Object(row.dark_key, readFileSync(row.source.dark), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }));
      if (row.source.light) uploads.push(putR2Object(row.light_key, readFileSync(row.source.light), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }));
      await Promise.all(uploads);
      uploaded++;
    }
    console.log(`Uploaded ${uploaded} pairing schemes to B2.`);
  }

  const manifestPath = path.join(process.cwd(), dryRun ? 'pairing-schemes-manifest.dryrun.json' : 'pairing-schemes-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log(`Manifest written to: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
