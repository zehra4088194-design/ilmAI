// Uploads grade 11 + grade 12 Biology (previously fully missing — no local
// folder existed for either grade earlier this session) from E:/remaining-data.
// 11th-bio: ch1-ch12 flat files (order N -> chN). 12th-bio: ch15-ch27 flat
// files (order N -> ch(N+14), continuing the numbering from grade 11's bio).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

type Row = {
  subject_slug: 'biology';
  chapter_slug: string;
  chapter_id: string;
  content_section: 'mcq' | 'short' | 'long';
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

const G11_CHAPTERS: Chapter[] = [
  { name: 'Biodiversity & Classification', slug: 'g11-biodiversity-classification', order: 1, id: '282a7e20-b5a8-4b1c-a489-d4821a93949d' },
  { name: 'Bacteria and Viruses', slug: 'g11-bacteria-and-viruses', order: 2, id: '4e860eac-38be-4a6e-81d5-228264eb58c2' },
  { name: 'Cells & Subcellular Organelles', slug: 'g11-cells-subcellular-organelles', order: 3, id: '41d43287-db9c-4163-a46e-4ff94caa9263' },
  { name: 'Biomolecules', slug: 'g11-biomolecules', order: 4, id: '2fc15816-8a03-4081-850f-4e17d35f0c28' },
  { name: 'Enzymes', slug: 'g11-enzymes', order: 5, id: 'e63694f4-4bb2-473b-b393-b49457fdcf73' },
  { name: 'Bioenergetics', slug: 'g11-bioenergetics', order: 6, id: 'f1fb0235-1f91-48dc-9abf-23799e83757a' },
  { name: 'Structural and Computational Biology', slug: 'g11-structural-and-computational-biology', order: 7, id: '38bcd266-a52f-4849-a826-a324479d88d1' },
  { name: 'Plant Physiology', slug: 'g11-plant-physiology', order: 8, id: 'd22970eb-fad5-4b66-b29d-785617739f95' },
  { name: 'Human Digestive System', slug: 'g11-human-digestive-system', order: 9, id: '65bccfd5-7975-437b-b356-8ab392f1083d' },
  { name: 'Human Respiratory System', slug: 'g11-human-respiratory-system', order: 10, id: '3476029e-8d1c-456d-ac1d-bb068644ce0a' },
  { name: 'Human Circulatory System', slug: 'g11-human-circulatory-system', order: 11, id: 'bc06ab37-c0f6-46d6-8c26-3a2e4f05fa0a' },
  { name: 'Human Skeletal and Muscular Systems', slug: 'g11-human-skeletal-and-muscular-systems', order: 12, id: '9fa5c4b3-5515-42f0-8f72-a74fb41311ca' },
];

const G12_CHAPTERS: Chapter[] = [
  { name: 'Homeostasis', slug: 'g12-homeostasis', order: 1, id: '65b1d65d-e6d0-464b-81f5-a1edcdacb00b' },
  { name: 'Support and Movements', slug: 'g12-support-and-movements', order: 2, id: '0e795b2d-1a39-4f14-85be-581b2bd2567b' },
  { name: 'Coordination and Control', slug: 'g12-coordination-and-control', order: 3, id: '6d00f1a9-5871-4e13-a9d2-8c34b79ad270' },
  { name: 'Reproduction', slug: 'g12-reproduction', order: 4, id: '8d84166b-5138-48c0-91cb-0028b002cfd5' },
  { name: 'Growth and Development', slug: 'g12-growth-and-development', order: 5, id: '1a5e9608-4aa8-4b10-b58a-01401abf7084' },
  { name: 'Chromosomes and DNA', slug: 'g12-chromosomes-and-dna', order: 6, id: '467f02f3-a63d-4ab4-8c72-98e2a3f22300' },
  { name: 'Cell Cycle', slug: 'g12-cell-cycle', order: 7, id: 'ca5531d9-1e14-4095-b42d-cd32a6fcbcce' },
  { name: 'Variation and Genetics', slug: 'g12-variation-and-genetics', order: 8, id: '109f2849-3979-480b-be55-470bcac5cf4a' },
  { name: 'Biotechnology', slug: 'g12-biotechnology', order: 9, id: '69c687c7-b30e-422d-b844-88b52562f0ad' },
  { name: 'Evolution', slug: 'g12-evolution', order: 10, id: 'f9f934f8-ff43-4e67-8036-b3a51ce30d1a' },
  { name: 'Ecosystem', slug: 'g12-ecosystem', order: 11, id: 'f977791e-b5f8-4122-816b-024666b5c722' },
  { name: 'Some Major Ecosystems', slug: 'g12-some-major-ecosystems', order: 12, id: 'e6f28827-6793-4b25-8b8f-6ac7190e7076' },
  { name: 'Man and His Environment', slug: 'g12-man-and-his-environment', order: 13, id: '04a7f4c2-daae-4267-a5d5-18ffa0fd0065' },
];

function pushRow(rows: Row[], p: {
  chapter: Chapter; grade: 11 | 12; section: Row['content_section']; label: string;
  darkAbs?: string; lightAbs?: string; txtAbs?: string; titleSlug: string;
}) {
  const darkExists = p.darkAbs && existsSync(p.darkAbs);
  const lightExists = p.lightAbs && existsSync(p.lightAbs);
  const txtExists = p.txtAbs && existsSync(p.txtAbs);
  if (!darkExists && !lightExists) return;
  const keyBase = `library/biology/${p.chapter.slug}/${p.section}/${p.titleSlug}`;
  rows.push({
    subject_slug: 'biology',
    chapter_slug: p.chapter.slug,
    chapter_id: p.chapter.id,
    content_section: p.section,
    title: `Biology — Chapter ${p.chapter.order}: ${p.chapter.name} — ${p.label}`,
    book_title: `Class ${p.grade} Biology Notes (Punjab)`,
    light_key: lightExists ? `${keyBase}.light.pdf` : darkExists ? `${keyBase}.dark.pdf` : null,
    dark_key: darkExists ? `${keyBase}.dark.pdf` : lightExists ? `${keyBase}.light.pdf` : null,
    context_key: txtExists ? `${keyBase}.context.txt` : null,
    source: { dark: darkExists ? p.darkAbs : undefined, light: lightExists ? p.lightAbs : undefined, txt: txtExists ? p.txtAbs : undefined },
  });
}

function discover(root: string, chapters: Chapter[], grade: 11 | 12, numOffset: number): Row[] {
  const rows: Row[] = [];
  const allFiles = readdirSync(root).filter((f) => /\.pdf$/i.test(f));
  const darkFiles = allFiles.filter((f) => /dark\.pdf$/i.test(f));
  for (const chapter of chapters) {
    const localNum = chapter.order + numOffset;
    const chapterFiles = darkFiles.filter((f) => {
      const m = f.match(/^ch0?(\d+)[_]/i);
      return Boolean(m && Number(m[1]) === localNum);
    });
    const sections: { test: (f: string) => boolean; section: Row['content_section']; label: string; tag: string }[] = [
      { test: (f) => /mcq/i.test(f), section: 'mcq', label: 'MCQs', tag: 'mcqs' },
      { test: (f) => /long/i.test(f), section: 'long', label: 'Long Questions', tag: 'long-questions' },
      { test: (f) => /short/i.test(f), section: 'short', label: 'Short Questions', tag: 'short-questions' },
    ];
    for (const { test, section, label, tag } of sections) {
      const darkFile = chapterFiles.find(test);
      if (!darkFile) continue;
      const lightFile = darkFile.replace(/dark\.pdf$/i, 'light.pdf').replace(/Dark\.pdf$/, 'Light.pdf');
      const base = darkFile.replace(/_?[Dd]ark\.pdf$/, '');
      const txtCandidates = [`${base}.txt`, `${base}_source.txt`, `${base}_light.txt`];
      const txtFile = txtCandidates.find((f) => existsSync(path.join(root, f)));
      pushRow(rows, {
        chapter, grade, section, label,
        darkAbs: path.join(root, darkFile),
        lightAbs: path.join(root, lightFile),
        txtAbs: txtFile ? path.join(root, txtFile) : undefined,
        titleSlug: `${slugify(chapter.name)}-${tag}`,
      });
    }
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const rows: Row[] = [
    ...discover('E:/remaining-data/11th-bio', G11_CHAPTERS, 11, 0),
    ...discover('E:/remaining-data/12th-bio', G12_CHAPTERS, 12, 14),
  ];

  console.log(`Discovered ${rows.length} biology resources.${dryRun ? ' (DRY RUN)' : ''}`);
  const g11Count = rows.filter((r) => r.book_title.includes('11')).length;
  const g12Count = rows.filter((r) => r.book_title.includes('12')).length;
  console.log({ grade11: g11Count, grade12: g12Count });

  if (!dryRun) {
    let uploaded = 0;
    for (const row of rows) {
      const bucket = row.book_title.includes('11') || row.book_title.includes('12') ? process.env.SECONDARY_STORAGE_BUCKET : undefined;
      const uploads: Promise<void>[] = [];
      if (row.source.dark && row.dark_key) uploads.push(putR2Object(row.dark_key, readFileSync(row.source.dark), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, bucket));
      if (row.source.light && row.light_key && row.light_key !== row.dark_key) uploads.push(putR2Object(row.light_key, readFileSync(row.source.light), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, bucket));
      if (row.source.txt && row.context_key) uploads.push(putR2Object(row.context_key, readFileSync(row.source.txt), { contentType: 'text/plain; charset=utf-8', cacheControl: 'public, max-age=31536000, immutable' }, bucket));
      await Promise.all(uploads);
      uploaded++;
      if (uploaded % 20 === 0) console.log(`  uploaded ${uploaded}/${rows.length}...`);
    }
    console.log(`Uploaded ${uploaded} resources' files to B2 (secondary bucket).`);
  }

  const manifestPath = path.join(process.cwd(), dryRun ? 'remaining-biology-manifest.dryrun.json' : 'remaining-biology-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log(`Manifest written to: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
