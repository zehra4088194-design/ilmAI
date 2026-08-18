// Fills the previously-missing grade 12 Computer Science (Ch9 "Elements of C")
// and Tarjuma Tul Quran (11 of 17 surahs) chapters from E:/remaining-data.
// Both folders here are a full flat re-supply of ALL chapters (not just the
// missing ones) — safe to upload all of it, same deterministic keys as
// before so already-covered chapters just get overwritten in place.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

type Row = {
  subject_slug: 'computer-science' | 'tarjuma-tul-quran';
  chapter_slug: string;
  chapter_id: string;
  content_section: 'mcq' | 'short' | 'long' | 'reading';
  title: string;
  book_title: string;
  light_key: string | null;
  dark_key: string | null;
  context_key: string | null;
  source: { light?: string; dark?: string; txt?: string };
};

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

type Chapter = { name: string; slug: string; order: number; id: string };

const CS_CHAPTERS: Chapter[] = [
  { name: 'Data Basics', slug: 'g12-data-basics', order: 1, id: 'dfdba44c-3d9c-4862-86de-9e0d5bf716f6' },
  { name: 'Basic Concepts and Terminology of Databases', slug: 'g12-basic-concepts-and-terminology-of-databases', order: 2, id: '569bfd25-217a-4534-b4dc-91b22526983e' },
  { name: 'Database Design Process', slug: 'g12-database-design-process', order: 3, id: '80a20fcc-bacf-4def-b363-a6f5410652a8' },
  { name: 'Data Integrity and Normalization', slug: 'g12-data-integrity-and-normalization', order: 4, id: '0c5b788b-425b-4667-bdf3-dcbdfa9dffc8' },
  { name: 'Introduction to Microsoft Access', slug: 'g12-introduction-to-microsoft-access', order: 5, id: 'bd444802-38a0-43c4-9e2d-a9408d69e1e6' },
  { name: 'Table and Query', slug: 'g12-table-and-query', order: 6, id: 'daaa1470-d13c-4f1e-906b-ee028bc8f2c2' },
  { name: 'Microsoft Access Forms and Reports', slug: 'g12-microsoft-access-forms-and-reports', order: 7, id: 'be023c5e-2441-48e0-9d65-27b7f999ff9f' },
  { name: 'Getting Started with C', slug: 'g12-getting-started-with-c', order: 8, id: '98743aec-c754-4584-8105-d1d03703353e' },
  { name: 'Elements of C', slug: 'g12-elements-of-c', order: 9, id: '3a437894-da7a-440f-94a7-34ff4405c2fe' },
  { name: 'Input/Output', slug: 'g12-inputoutput', order: 10, id: '68f3881a-6813-4cf5-b5a3-4521f6be0f92' },
  { name: 'Decision Constructs', slug: 'g12-decision-constructs', order: 11, id: 'e1df634e-fb4f-4a6f-b44e-d9b057178786' },
  { name: 'Loop Constructs', slug: 'g12-loop-constructs', order: 12, id: '8b041a91-5fd3-4248-b707-6aa17247214d' },
  { name: 'Functions in C', slug: 'g12-functions-in-c', order: 13, id: '46a56baf-5209-4d25-bf94-e496f438e15d' },
  { name: 'File Handling in C', slug: 'g12-file-handling-in-c', order: 14, id: '5ee69cdd-572c-4d77-8d2f-66731a765196' },
];

const TQ_CHAPTERS: Chapter[] = [
  { name: 'Surah An-Nisa', slug: 'g12-surah-an-nisa', order: 1, id: '3756975c-541f-44c5-a6d1-eb7b0660ffe6' },
  { name: "Surah Al-Ma'idah", slug: 'g12-surah-al-maidah', order: 2, id: '5644379e-710c-4fb0-bcb8-4734b7304c97' },
  { name: 'Surah An-Nur', slug: 'g12-surah-an-nur', order: 3, id: '01155e48-8257-43fe-923d-4f3fd8358fbd' },
  { name: 'Surah Al-Ahzab', slug: 'g12-surah-al-ahzab', order: 4, id: '2151de96-1a35-4638-8779-419b2cab220c' },
  { name: 'Surah Muhammad', slug: 'g12-surah-muhammad', order: 5, id: '03cc0022-2765-44ca-927e-c9b9fddeb0c3' },
  { name: 'Surah Al-Fath', slug: 'g12-surah-al-fath', order: 6, id: '6834aa3e-816e-4f60-83cd-a7872cc9bfbf' },
  { name: 'Surah Al-Hujurat', slug: 'g12-surah-al-hujurat', order: 7, id: '47c7c3d4-04ad-473d-a36b-01f67022e4ec' },
  { name: 'Surah Al-Hadid', slug: 'g12-surah-al-hadid', order: 8, id: '01d6106b-5d0d-475b-a900-16241749c078' },
  { name: 'Surah Al-Mujadila', slug: 'g12-surah-al-mujadila', order: 9, id: '0ded1616-bf80-4f29-9b87-28d7858961b3' },
  { name: 'Surah Al-Hashr', slug: 'g12-surah-al-hashr', order: 10, id: 'a8a93593-d782-41b3-8fde-8ea79e952e3b' },
  { name: 'Surah Al-Mumtahanah', slug: 'g12-surah-al-mumtahanah', order: 11, id: 'd8c906d5-ae30-4bdb-b603-816fb71b227f' },
  { name: 'Surah As-Saf', slug: 'g12-surah-as-saf', order: 12, id: '30a97538-ae76-4a5b-a5b3-75effb1a03ad' },
  { name: "Surah Al-Jumu'ah", slug: 'g12-surah-al-jumuah', order: 13, id: '4e52048e-a049-4410-8aee-cbd13c65f7ad' },
  { name: 'Surah Al-Munafiqun', slug: 'g12-surah-al-munafiqun', order: 14, id: 'ae252c5b-5e7b-43fb-bd9b-43e7cb6fdc93' },
  { name: 'Surah At-Taghabun', slug: 'g12-surah-at-taghabun', order: 15, id: '156a42af-d4ba-487f-8270-ad34b21bb187' },
  { name: 'Surah At-Talaq', slug: 'g12-surah-at-talaq', order: 16, id: '08dc188d-d03c-451e-93e4-55fca513dcd7' },
  { name: 'Surah At-Tahrim', slug: 'g12-surah-at-tahrim', order: 17, id: '0161270e-6433-4606-8f5f-83b44c34ef0a' },
];

function pushRow(rows: Row[], p: {
  subjectSlug: Row['subject_slug']; chapter: Chapter; section: Row['content_section']; label: string;
  darkAbs?: string; lightAbs?: string; txtAbs?: string; titleSlug: string;
}) {
  const darkExists = p.darkAbs && existsSync(p.darkAbs);
  const lightExists = p.lightAbs && existsSync(p.lightAbs);
  const txtExists = p.txtAbs && existsSync(p.txtAbs);
  if (!darkExists && !lightExists) return;
  const keyBase = `library/${p.subjectSlug}/${p.chapter.slug}/${p.section}/${p.titleSlug}`;
  rows.push({
    subject_slug: p.subjectSlug,
    chapter_slug: p.chapter.slug,
    chapter_id: p.chapter.id,
    content_section: p.section,
    title: `${p.subjectSlug === 'computer-science' ? 'Computer Science' : 'Tarjuma Tul Quran'} — Chapter ${p.chapter.order}: ${p.chapter.name} — ${p.label}`,
    book_title: `Class 12 ${p.subjectSlug === 'computer-science' ? 'Computer Science' : 'Tarjuma Tul Quran'} Notes (Punjab)`,
    light_key: lightExists ? `${keyBase}.light.pdf` : darkExists ? `${keyBase}.dark.pdf` : null,
    dark_key: darkExists ? `${keyBase}.dark.pdf` : lightExists ? `${keyBase}.light.pdf` : null,
    context_key: txtExists ? `${keyBase}.context.txt` : null,
    source: { dark: darkExists ? p.darkAbs : undefined, light: lightExists ? p.lightAbs : undefined, txt: txtExists ? p.txtAbs : undefined },
  });
}

function discoverCS(): Row[] {
  const rows: Row[] = [];
  const root = 'E:/remaining-data/12th-com';
  const darkFiles = readdirSync(root).filter((f) => /Dark\.pdf$/i.test(f));
  for (const chapter of CS_CHAPTERS) {
    const chapterFiles = darkFiles.filter((f) => {
      const m = f.match(/^Ch0?(\d+)_/i);
      return Boolean(m && Number(m[1]) === chapter.order);
    });
    const sections: [RegExp, Row['content_section'], string, string][] = [
      [/mcq/i, 'mcq', 'MCQs', 'mcqs'],
      [/longq/i, 'long', 'Long Questions', 'long-questions'],
      [/shortq/i, 'short', 'Short Questions', 'short-questions'],
    ];
    for (const [token, section, label, tag] of sections) {
      const darkFile = chapterFiles.find((f) => token.test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtFile = darkFile.replace(/_Dark\.pdf$/i, '.txt');
      pushRow(rows, {
        subjectSlug: 'computer-science', chapter, section, label,
        darkAbs: path.join(root, darkFile), lightAbs: path.join(root, lightFile), txtAbs: path.join(root, txtFile),
        titleSlug: `${slugify(chapter.name)}-${tag}`,
      });
    }
  }
  return rows;
}

function discoverTQ(): Row[] {
  const rows: Row[] = [];
  const root = 'E:/remaining-data/12th-T_Q';
  const darkFiles = readdirSync(root).filter((f) => /Dark\.pdf$/i.test(f));
  for (const chapter of TQ_CHAPTERS) {
    const chapterFiles = darkFiles.filter((f) => {
      const m = f.match(/^(\d+)_/);
      return Boolean(m && Number(m[1]) === chapter.order);
    });
    const sections: [RegExp, Row['content_section'], string, string][] = [
      [/mcq/i, 'mcq', 'MCQs', 'mcqs'],
      [/notes/i, 'reading', 'Notes', 'notes'],
    ];
    for (const [token, section, label, tag] of sections) {
      const darkFile = chapterFiles.find((f) => token.test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/Dark\.pdf$/i, 'Light.pdf');
      const txtFile = darkFile.replace(/_Dark\.pdf$/i, '.txt');
      pushRow(rows, {
        subjectSlug: 'tarjuma-tul-quran', chapter, section, label,
        darkAbs: path.join(root, darkFile), lightAbs: path.join(root, lightFile), txtAbs: path.join(root, txtFile),
        titleSlug: `${slugify(chapter.name)}-${tag}`,
      });
    }
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const rows: Row[] = [...discoverCS(), ...discoverTQ()];
  console.log(`Discovered ${rows.length} resources.${dryRun ? ' (DRY RUN)' : ''}`);
  console.log({
    cs: rows.filter((r) => r.subject_slug === 'computer-science').length,
    tq: rows.filter((r) => r.subject_slug === 'tarjuma-tul-quran').length,
  });

  if (!dryRun) {
    let uploaded = 0;
    for (const row of rows) {
      const uploads: Promise<void>[] = [];
      if (row.source.dark && row.dark_key) uploads.push(putR2Object(row.dark_key, readFileSync(row.source.dark), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, process.env.SECONDARY_STORAGE_BUCKET));
      if (row.source.light && row.light_key && row.light_key !== row.dark_key) uploads.push(putR2Object(row.light_key, readFileSync(row.source.light), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, process.env.SECONDARY_STORAGE_BUCKET));
      if (row.source.txt && row.context_key) uploads.push(putR2Object(row.context_key, readFileSync(row.source.txt), { contentType: 'text/plain; charset=utf-8', cacheControl: 'public, max-age=31536000, immutable' }, process.env.SECONDARY_STORAGE_BUCKET));
      await Promise.all(uploads);
      uploaded++;
      if (uploaded % 20 === 0) console.log(`  uploaded ${uploaded}/${rows.length}...`);
    }
    console.log(`Uploaded ${uploaded} resources' files to B2 (secondary bucket).`);
  }

  const manifestPath = path.join(process.cwd(), dryRun ? 'remaining-12th-com-tq-manifest.dryrun.json' : 'remaining-12th-com-tq-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log(`Manifest written to: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
