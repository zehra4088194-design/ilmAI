// Complete re-supply of grade 11 Urdu (chapters 1-18, 21, 22) from
// E:/remaining-data/11th-urdu/chapters — fills the 6 chapters that were
// missing from the original pass (3,4,5,6,9,10) plus re-covers everything
// else with the same deterministic keys (safe overwrite, no duplicates).
// Uploads to the SECONDARY bucket (11th/12th grade content).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

type Row = {
  subject_slug: 'urdu';
  chapter_slug: string;
  chapter_id: string;
  content_section: 'mcq' | 'reading';
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
  { name: 'Hamd', slug: 'g11-hamd', order: 1, id: '49439f37-5674-4e67-a944-7f1697d3d250' },
  { name: 'Naat', slug: 'g11-naat', order: 2, id: '3bd47830-5de8-4195-bd9d-1f0f48c0a227' },
  { name: 'Akhlaq-e-Nabvi SAW', slug: 'g11-akhlaq-e-nabvi-saw', order: 3, id: 'f36a0832-b87b-4dba-bfa2-56db28418349' },
  { name: 'Faqa ma Roza', slug: 'g11-faqa-ma-roza', order: 4, id: '54988f57-23eb-4f63-b85f-3cf3c44f2aee' },
  { name: 'Makateeb e Ghalib', slug: 'g11-makateeb-e-ghalib', order: 5, id: '5c81fa1e-4b5f-4e1c-b811-cb9a7db9ea76' },
  { name: 'Aik Ustad Adalat Mein', slug: 'g11-aik-ustad-adalat-mein', order: 6, id: '59a73ef7-5076-470d-a3a0-65e15f93e845' },
  { name: 'Charpai', slug: 'g11-charpai', order: 7, id: '8a71f2ef-e11c-4baf-8141-f01c1f528bc4' },
  { name: 'Aur Pakistan bn Gya', slug: 'g11-aur-pakistan-bn-gya', order: 8, id: '2bf43e7f-c117-4e97-b490-6b30345e4a2d' },
  { name: 'Naya Qanoon', slug: 'g11-naya-qanoon', order: 9, id: '79ed6d4b-1dd0-4c7a-9184-9a3f045e3cef' },
  { name: 'Dehleez', slug: 'g11-dehleez', order: 10, id: '0f1cd333-2d77-476f-ae31-3cdd2f4601b0' },
  { name: 'Tareekh ka Kafan', slug: 'g11-tareekh-ka-kafan', order: 11, id: 'ba300f30-9d6e-40aa-8a00-409078f5695e' },
  { name: 'Pakistani Zubane aur un ka bahmi rishta', slug: 'g11-pakistani-zubane-aur-un-ka-bahmi-rishta', order: 12, id: '8ffc879c-0216-4746-b35a-04011451003d' },
  { name: 'Ay Wadi e Lolaab', slug: 'g11-ay-wadi-e-lolaab', order: 13, id: 'caac54ec-9a8e-4921-b80f-f593c44bbd80' },
  { name: 'O Des Se Aane Wale Bata', slug: 'g11-o-des-se-aane-wale-bata', order: 14, id: '0753cdfe-6410-4063-9fe4-317d6ccb0943' },
  { name: 'Azadi', slug: 'g11-azadi', order: 15, id: 'a4d1d1c5-713c-4fd1-b402-87bd4b70d593' },
  { name: 'Ikhlas', slug: 'g11-ikhlas', order: 16, id: 'f0176d13-659e-4905-8db8-9d3b1b032607' },
  { name: 'Khara Dinner', slug: 'g11-khara-dinner', order: 17, id: 'a8d9b8b9-f4a4-4578-ad5f-635b0d58c85e' },
  { name: 'Patta Patta Buta Buta Hal Hamara Jaane Hai', slug: 'g11-patta-patta-buta-buta-hal-hamara-jaane-hai', order: 18, id: '7caa8b82-7a35-47dd-aeb2-6c195c937a01' },
  { name: 'Silsaly tor Gaya wo Sabhi jataty jataty', slug: 'g11-silsaly-tor-gaya-wo-sabhi-jataty-jataty', order: 21, id: '6baddff7-b549-492e-bc59-91529c777e39' },
  { name: 'Badban Khulne Se Pehle ka Ishara', slug: 'g11-badban-khulne-se-pehle-ka-ishara', order: 22, id: 'dcc69c9f-6be1-4153-a22e-db1cee28f3e6' },
];

function pushRow(rows: Row[], p: {
  chapter: Chapter; section: Row['content_section']; label: string;
  darkAbs?: string; lightAbs?: string; txtAbs?: string; titleSlug: string;
}) {
  const darkExists = p.darkAbs && existsSync(p.darkAbs);
  const lightExists = p.lightAbs && existsSync(p.lightAbs);
  const txtExists = p.txtAbs && existsSync(p.txtAbs);
  if (!darkExists && !lightExists) return;
  const keyBase = `library/urdu/${p.chapter.slug}/${p.section}/${p.titleSlug}`;
  rows.push({
    subject_slug: 'urdu',
    chapter_slug: p.chapter.slug,
    chapter_id: p.chapter.id,
    content_section: p.section,
    title: `Urdu — ${p.chapter.name} — ${p.label}`,
    book_title: 'Class 11 Urdu Notes (Punjab)',
    light_key: lightExists ? `${keyBase}.light.pdf` : `${keyBase}.dark.pdf`,
    dark_key: darkExists ? `${keyBase}.dark.pdf` : `${keyBase}.light.pdf`,
    context_key: txtExists ? `${keyBase}.context.txt` : null,
    source: { dark: darkExists ? p.darkAbs : undefined, light: lightExists ? p.lightAbs : undefined, txt: txtExists ? p.txtAbs : undefined },
  });
}

function discover(): Row[] {
  const rows: Row[] = [];
  const root = 'E:/remaining-data/11th-urdu/chapters';
  const darkFiles = readdirSync(root).filter((f) => /dark\.pdf$/i.test(f));
  for (const chapter of CHAPTERS) {
    const chapterFiles = darkFiles.filter((f) => {
      const m = f.match(/^(\d+)_/);
      return Boolean(m && Number(m[1]) === chapter.order);
    });
    const sections: [RegExp, Row['content_section'], string, string][] = [
      [/mcq/i, 'mcq', 'MCQs', 'mcqs'],
      [/notes/i, 'reading', 'Notes', 'notes'],
    ];
    for (const [token, section, label, tag] of sections) {
      let darkFile = chapterFiles.find((f) => token.test(f));
      // some chapters (e.g. 13_wadi_lolab) have no "notes"/"mcqs" word at all —
      // the plain numbered file is the reading/notes content, "_mcqs" suffixed is mcq.
      if (!darkFile && section === 'reading') darkFile = chapterFiles.find((f) => !/mcq/i.test(f));
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/dark\.pdf$/i, 'light.pdf').replace(/Dark\.pdf$/, 'Light.pdf');
      const base = darkFile.replace(/_?[Dd]ark\.pdf$/, '');
      const txtFile = `${base}.txt`;
      pushRow(rows, {
        chapter, section, label,
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
  const rows = discover();
  console.log(`Discovered ${rows.length} Urdu resources (of ${CHAPTERS.length * 2} possible).${dryRun ? ' (DRY RUN)' : ''}`);
  rows.forEach((r) => console.log(' -', r.title));

  if (!dryRun) {
    let uploaded = 0;
    for (const row of rows) {
      const bucket = process.env.SECONDARY_STORAGE_BUCKET;
      const uploads: Promise<void>[] = [];
      if (row.source.dark && row.dark_key) uploads.push(putR2Object(row.dark_key, readFileSync(row.source.dark), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, bucket));
      if (row.source.light && row.light_key && row.light_key !== row.dark_key) uploads.push(putR2Object(row.light_key, readFileSync(row.source.light), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, bucket));
      if (row.source.txt && row.context_key) uploads.push(putR2Object(row.context_key, readFileSync(row.source.txt), { contentType: 'text/plain; charset=utf-8', cacheControl: 'public, max-age=31536000, immutable' }, bucket));
      await Promise.all(uploads);
      uploaded++;
      if (uploaded % 10 === 0) console.log(`  uploaded ${uploaded}/${rows.length}...`);
    }
    console.log(`Uploaded ${uploaded} resources' files to B2 (secondary bucket).`);
  }

  const manifestPath = path.join(process.cwd(), dryRun ? 'remaining-11th-urdu-manifest.dryrun.json' : 'remaining-11th-urdu-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log(`Manifest written to: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
