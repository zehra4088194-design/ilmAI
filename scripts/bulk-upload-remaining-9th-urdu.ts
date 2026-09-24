// Grade 9 Urdu per-chapter poem/prose notes — previously only generic essay-
// group content was captured for 9th Urdu; this fills the actual per-chapter
// tashreeh content from E:/remaining-data/9th-urdu.
// `chapters/` = ch-1..ch-11 -> DB order 1-11 directly (confirmed: ch-1's
// content header literally says "سبق 1" and is Nazam Hamd, DB order 1).
// `nazam/` = nazam-1..6 -> the 6 remaining DB "Nazam" chapters in order
// (12,13,14,15,20,21) — confirmed by nazam-1's content header saying "نظم 12"
// which is exactly the first of those six.
// `ghazal/` = ghazal-1..4 -> the 4 DB "Ghazal" chapters in order (16-19) —
// confirmed by ghazal-1's content matching "Faqirana Aae Sada Kar Chale" (16).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

type Row = {
  subject_slug: 'urdu';
  chapter_slug: string;
  chapter_id: string;
  content_section: 'reading';
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

const CHAPTERS: Chapter[] = [
  { name: 'Nazam Hamad', slug: 'g9-nazam-hamad', order: 1, id: '6cac4540-e848-4985-93f4-c6c1620d22e3' },
  { name: 'Nazam Naat', slug: 'g9-nazam-naat', order: 2, id: 'aeb98d51-6108-41c3-b4a8-c4d4456947e2' },
  { name: 'Akhlaq e Hasna', slug: 'g9-akhlaq-e-hasna', order: 3, id: '51f70767-f384-44e3-a117-b40eb6577c76' },
  { name: 'Apni Madad Aap', slug: 'g9-apni-madad-aap', order: 4, id: '31283998-b92d-4ad1-a0cb-28003f4cc69a' },
  { name: 'Kaleem aur Mirza Zahir Dar Baig', slug: 'g9-kaleem-aur-mirza-zahir-dar-baig', order: 5, id: '4e146192-af07-4127-8a2e-dbbd7ba3cf74' },
  { name: 'Naam Dev Maali', slug: 'g9-naam-dev-maali', order: 6, id: '87068c45-ed0e-4627-94de-35912632302f' },
  { name: 'Araam o Sukoon', slug: 'g9-araam-o-sukoon', order: 7, id: 'eaacff16-f176-4558-a394-fdaa6f6c068b' },
  { name: 'Katba', slug: 'g9-katba', order: 8, id: '6cc44f92-f467-4697-a89d-face119a9f32' },
  { name: 'Ibtidai Hisab', slug: 'g9-ibtidai-hisab', order: 9, id: '41585759-9eee-4cf4-af2a-f824ec4fbec4' },
  { name: 'Lari Main Paroye Huvay Manazr', slug: 'g9-lari-main-paroye-huvay-manazr', order: 10, id: '6a97f1ca-7aae-4535-b35d-248e51b872ae' },
  { name: 'Bhairiya', slug: 'g9-bhairiya', order: 11, id: '3c862356-9bb4-472f-9190-b8f2f7cef3d2' },
  { name: 'Nazam Mehnat Ki Barkaat', slug: 'g9-nazam-mehnat-ki-barkaat', order: 12, id: 'c8b9a776-74f8-4ab4-8f37-aa957732b18d' },
  { name: 'Nazam Javed Ke Naam', slug: 'g9-nazam-javed-ke-naam', order: 13, id: '748cd4a7-2fc2-4700-9c27-7313a9bfe66f' },
  { name: 'Nazam Payam e Latif', slug: 'g9-nazam-payam-e-latif', order: 14, id: 'ec8c2a15-bf3b-4a83-8d23-e51a0233872c' },
  { name: 'Nazam Cricket Aur Mushaira', slug: 'g9-nazam-cricket-aur-mushaira', order: 15, id: '885173e1-3ecb-4d76-99c9-0db07896b896' },
  { name: 'Ghazal Faqirana Aae Sada Kar Chale', slug: 'g9-ghazal-faqirana-aae-sada-kar-chale', order: 16, id: '78e7b720-844f-47e6-a679-09f3235ea6fb' },
  { name: 'Ghazal Sun To Sahi Jahaan Mein Hai Tera Fasana', slug: 'g9-ghazal-sun-to-sahi-jahaan-mein-hai-tera-fasana', order: 17, id: '92ef900b-5285-4be1-9328-7f616870bb10' },
  { name: 'Ghazal Gham Hai Ya Khushi Hai Tu', slug: 'g9-ghazal-gham-hai-ya-khushi-hai-tu', order: 18, id: '07c49e51-fba4-43b7-9a4b-8f0b97038a02' },
  { name: 'Ghazal Kash Taufaan Mein Safeene Ko Utara Hota', slug: 'g9-ghazal-kash-taufaan-mein-safeene-ko-utara-hota', order: 19, id: 'ba5fe4f4-6cde-4c3c-af35-7828e7382862' },
  { name: 'Hosla Na Haro Aage Barho', slug: 'g9-hosla-na-haro-aage-barho', order: 20, id: '9d9af51c-a0be-46f3-b662-3c40edb6dd6a' },
  { name: 'Shuhdaye Pishawar Ke Liye Ek Nazam', slug: 'g9-shuhdaye-pishawar-ke-liye-ek-nazam', order: 21, id: '5be4ccc5-f9f9-4bf4-8a3f-2585ec19b4cb' },
];

const NAZAM_ORDER_BY_LOCAL = [12, 13, 14, 15, 20, 21]; // nazam-1..6
const GHAZAL_ORDER_BY_LOCAL = [16, 17, 18, 19]; // ghazal-1..4

function pushRow(rows: Row[], chapter: Chapter, dir: string, darkFile: string) {
  const lightFile = darkFile.replace(/-?dark\.pdf$/i, '-light.pdf');
  const base = darkFile.replace(/-?dark\.pdf$/i, '');
  const txtCandidates = [`${base}.txt`, `${base}-content.txt`];
  const txtFile = txtCandidates.find((f) => existsSync(path.join(dir, f)));
  const darkAbs = path.join(dir, darkFile);
  const lightAbs = path.join(dir, lightFile);
  if (!existsSync(darkAbs) && !existsSync(lightAbs)) return;
  const keyBase = `library/urdu/${chapter.slug}/reading/${slugify(chapter.name)}-notes`;
  rows.push({
    subject_slug: 'urdu',
    chapter_slug: chapter.slug,
    chapter_id: chapter.id,
    content_section: 'reading',
    title: `Urdu — Chapter ${chapter.order}: ${chapter.name} — Notes`,
    book_title: 'Class 9 Urdu Notes (Punjab)',
    light_key: existsSync(lightAbs) ? `${keyBase}.light.pdf` : `${keyBase}.dark.pdf`,
    dark_key: existsSync(darkAbs) ? `${keyBase}.dark.pdf` : `${keyBase}.light.pdf`,
    context_key: txtFile ? `${keyBase}.context.txt` : null,
    source: { dark: existsSync(darkAbs) ? darkAbs : undefined, light: existsSync(lightAbs) ? lightAbs : undefined, txt: txtFile ? path.join(dir, txtFile) : undefined },
  });
}

function discover(): Row[] {
  const rows: Row[] = [];

  const chDir = 'E:/remaining-data/9th-urdu/chapters';
  const chFiles = readdirSync(chDir).filter((f) => /dark\.pdf$/i.test(f));
  for (let n = 1; n <= 11; n++) {
    const chapter = CHAPTERS.find((c) => c.order === n)!;
    const darkFile = chFiles.find((f) => new RegExp(`^ch-?0?${n}[_-]`, 'i').test(f));
    if (darkFile) pushRow(rows, chapter, chDir, darkFile);
  }

  const nazamDir = 'E:/remaining-data/9th-urdu/nazam';
  const nazamFiles = readdirSync(nazamDir).filter((f) => /dark\.pdf$/i.test(f));
  NAZAM_ORDER_BY_LOCAL.forEach((order, idx) => {
    const local = idx + 1;
    const chapter = CHAPTERS.find((c) => c.order === order)!;
    const darkFile = nazamFiles.find((f) => new RegExp(`^nazam-?0?${local}[_-]`, 'i').test(f));
    if (darkFile) pushRow(rows, chapter, nazamDir, darkFile);
  });

  const ghazalDir = 'E:/remaining-data/9th-urdu/ghazal';
  const ghazalFiles = readdirSync(ghazalDir).filter((f) => /dark\.pdf$/i.test(f));
  GHAZAL_ORDER_BY_LOCAL.forEach((order, idx) => {
    const local = idx + 1;
    const chapter = CHAPTERS.find((c) => c.order === order)!;
    const darkFile = ghazalFiles.find((f) => new RegExp(`^ghazal-?0?${local}[_-]`, 'i').test(f));
    if (darkFile) pushRow(rows, chapter, ghazalDir, darkFile);
  });

  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const rows = discover();
  console.log(`Discovered ${rows.length} Urdu resources (of 21 possible chapters).${dryRun ? ' (DRY RUN)' : ''}`);
  rows.forEach((r) => console.log(' -', r.title));

  if (!dryRun) {
    let uploaded = 0;
    for (const row of rows) {
      const uploads: Promise<void>[] = [];
      if (row.source.dark && row.dark_key) uploads.push(putR2Object(row.dark_key, readFileSync(row.source.dark), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }));
      if (row.source.light && row.light_key && row.light_key !== row.dark_key) uploads.push(putR2Object(row.light_key, readFileSync(row.source.light), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }));
      if (row.source.txt && row.context_key) uploads.push(putR2Object(row.context_key, readFileSync(row.source.txt), { contentType: 'text/plain; charset=utf-8', cacheControl: 'public, max-age=31536000, immutable' }));
      await Promise.all(uploads);
      uploaded++;
    }
    console.log(`Uploaded ${uploaded} resources' files to B2 (primary bucket).`);
  }

  const manifestPath = path.join(process.cwd(), dryRun ? 'remaining-9th-urdu-manifest.dryrun.json' : 'remaining-9th-urdu-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log(`Manifest written to: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
