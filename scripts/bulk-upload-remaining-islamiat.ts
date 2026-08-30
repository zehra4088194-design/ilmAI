// Islamiat notes for grades 9, 10, 11 — a subject skipped for the whole
// library rollout until now. E:/remaining-data/{9th,10th,11th}-islam each use
// a DIFFERENT, inconsistent folder scheme per chapter (flat dark/light/txt
// folders, "Topic-N_Name" subfolders, per-topic filenames, mixed folder-name
// casing) — rather than hand-code every variant, this recursively walks the
// whole tree and groups files generically:
//   - chapter number: first "Ch-N" / "Chapter N" / "Baab-N" / "باب-N" token
//     found anywhere in the file's full path.
//   - section: mcq/short/long token in the filename.
//   - topic key: the dark filename with the chapter/section tokens and
//     dark/light suffix stripped — used to dedupe + pair with its light/txt
//     companions, and title-cased into a human label.
// This means every topic under every chapter becomes its own resource row
// (same chapter_id, different titles) — confirmed with the user as the
// approach, since library_resources has no topic-level column.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';

type Row = {
  subject_slug: 'islamiat';
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

const G9_CHAPTERS: Chapter[] = [
  { name: 'Quran Majeed aur Hadees Nabwi (S.A.W)', slug: 'g9-quran-majeed-aur-hadees-nabwi-saw', order: 1, id: '5268125d-0c0b-4f58-9d53-a07e54f4f52a' },
  { name: 'Imaniyat aur Ibadaat', slug: 'g9-imaniyat-aur-ibadaat', order: 2, id: 'b081820e-9306-4350-a5f1-3c4c0e92ea9e' },
  { name: 'Seerat-e-Nabwi (S.A.W)', slug: 'g9-seerat-e-nabwi-saw', order: 3, id: 'be2ff373-3e4e-439e-bfc4-da63907b08de' },
  { name: 'Akhlaq-o-Adab', slug: 'g9-akhlaq-o-adab', order: 4, id: '05607249-481f-43bf-86eb-b88ee48741f4' },
  { name: 'Husn-e-Mamlaat and Muashrat', slug: 'g9-husn-e-mamlaat-and-muashrat', order: 5, id: 'a0435ad3-0fb6-4cac-88f4-a89a6ac19d4b' },
  { name: 'Hidayat ke Sar Chashme aur Mashaheer-e-Islam', slug: 'g9-hidayat-ke-sar-chashme-aur-mashaheer-e-islam', order: 6, id: '9c8f3df1-5ed4-4150-8ed6-46b28ea3c065' },
  { name: 'Islami Taleemat aur Asr Hazir ke Taqaze', slug: 'g9-islami-taleemat-aur-asr-hazir-ke-taqaze', order: 7, id: '01b54a38-1ebb-4163-ae90-81ded082c209' },
];

// g10 order_index doesn't match the local "Chapter N" numbering directly —
// local files are labelled Chapter 5-9 (Ahadees topics), which map to
// order_index 3-7 per the DB (Surah Al-Ahzab/Al-Mumtahina are 1/2, unlabelled
// locally / not present in remaining-data).
const G10_CHAPTERS: Chapter[] = [
  { name: 'Ahadees - Chapter 5: Taharat-o-Jismani Safai', slug: 'g10-ahadees---chapter-5-taharat-o-jismani-safai', order: 5, id: 'b8a0501f-e066-4f3e-a50e-042f9db6d1d8' },
  { name: 'Ahadees - Chapter 6: Sabar-o-Shukar or Hamari Infarad-O-Ijtimai Zindagi', slug: 'g10-ahadees---chapter-6-sabar-o-shukar-or-hamari-infarad-o-ijtimai-zindagi', order: 6, id: '3e4900ef-4004-45ba-9afc-2504bc4089de' },
  { name: 'Ahadees - Chapter 7: Ayli Zindage Ki Ahmiyat', slug: 'g10-ahadees---chapter-7-ayli-zindage-ki-ahmiyat', order: 7, id: '081ab6fb-61af-461e-9b1a-02cac096a1cf' },
  { name: 'Ahadees - Chapter 8: Hijrat-o-Jahad', slug: 'g10-ahadees---chapter-8-hijrat-o-jahad', order: 8, id: '9b49a793-2289-41ab-b376-14487b5a7a03' },
  { name: 'Ahadees - Chapter 9: Huqooq-Ul-Ibad', slug: 'g10-ahadees---chapter-9-huqooq-ul-ibad', order: 9, id: '549782a1-d692-4297-9908-1e995fcfa4fe' },
];

const G11_CHAPTERS: Chapter[] = [
  { name: 'Quran-o-Hadees', slug: 'g11-quran-o-hadees', order: 1, id: '' }, // filled in from grade-chapters-11-12.json below
  { name: 'Emaniyat', slug: 'g11-emaniyat', order: 2, id: '' },
  { name: 'Seerat-e-Tayyaba', slug: 'g11-seerat-e-tayyaba', order: 3, id: '' },
  { name: 'Akhlaq-o-Aadab', slug: 'g11-akhlaq-o-aadab', order: 4, id: '' },
  { name: 'Husn-e-Muamlaat-o-Muashrat', slug: 'g11-husn-e-muamlaat-o-muashrat', order: 5, id: '' },
  { name: 'Hidayat ke Sarchashme aur Mashaheer-e-Islam', slug: 'g11-hidayat-ke-sarchashme-aur-mashaheer-e-islam', order: 6, id: '' },
  { name: 'Islamic Taleemat aur Asr-e-Hazir ke Taqaze', slug: 'g11-islamic-taleemat-aur-asr-e-hazir-ke-taqaze', order: 7, id: '' },
];

function walkFiles(dir: string): string[] {
  let results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(walkFiles(full));
    else if (statSync(full).isFile()) results.push(full);
  }
  return results;
}

function extractChapterNumber(fullPath: string): number | null {
  const m =
    fullPath.match(/ch-?(\d+)/i) ||
    fullPath.match(/chapter-?\s?(\d+)/i) ||
    fullPath.match(/baab-?(\d+)/i) ||
    fullPath.match(/باب-(\d+)/);
  return m ? Number(m[1]) : null;
}

function sectionOf(name: string): Row['content_section'] | null {
  if (/mcq/i.test(name)) return 'mcq';
  if (/long/i.test(name)) return 'long';
  if (/short/i.test(name)) return 'short';
  return null;
}

function topicKeyOf(darkBase: string): string {
  // Only strip the leading chapter-number token and the section word — the
  // "topic" word is stripped but its NUMBER is deliberately kept (some
  // folders embed the distinguishing topic id only as "topic-N" inside the
  // filename itself, e.g. "ch-2_topic-1_mcqs" vs "ch-2_topic-6_mcqs" — losing
  // that digit would collapse every topic in the chapter into one row).
  return darkBase
    .replace(/mcqs?/gi, '')
    .replace(/longs?q?/gi, '')
    .replace(/shorts?q?/gi, '')
    .replace(/^ch-?\d+_?/i, '')
    .replace(/^chapter-?\d+_?/i, '')
    .replace(/topic-?/gi, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

function titleCase(value: string) {
  return value.split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ') || 'Notes';
}

function discover(root: string, chapters: Chapter[], grade: 9 | 10 | 11): Row[] {
  const rows: Row[] = [];
  const allFiles = walkFiles(root);
  const darkFiles = allFiles.filter((f) => /dark\.pdf$/i.test(f));
  const seen = new Set<string>();

  for (const darkAbs of darkFiles) {
    const relDir = path.dirname(darkAbs);
    const base = path.basename(darkAbs);
    const chapterNum = extractChapterNumber(darkAbs);
    const chapter = chapters.find((c) => c.order === chapterNum);
    if (!chapter || !chapter.id) continue; // unmatched chapter number or missing id -> skip, don't guess
    const section = sectionOf(base);
    if (!section) continue;
    // "topic" comes from the nearest ancestor folder that looks like a topic
    // folder (contains "topic", or is a bare "<N>_Name" folder) — skipping
    // past a dark/light/txt leaf folder when the topic folder is one level
    // further up (Topic-N_Name/Dark/file.pdf) — otherwise from stripping
    // tokens out of the filename itself.
    const parentName = path.basename(relDir);
    const grandparentName = path.basename(path.dirname(relDir));
    const candidateName = /^(dark|light|txt|text)$/i.test(parentName) ? grandparentName : parentName;
    const isTopicFolder = /topic/i.test(candidateName) || /^\d+[_-]/.test(candidateName);
    const topicSource = isTopicFolder
      ? candidateName.replace(/^topic-?\d*_?/i, '').replace(/^\d+[_-]/, '')
      : topicKeyOf(base.replace(/_?dark\.pdf$/i, ''));
    const topicLabel = titleCase(topicSource.replace(/[_-]+/g, ' '));
    const dedupeKey = `${chapter.order}::${slugify(topicLabel)}::${section}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    // light: same filename with dark->light, in a sibling "light"/"Light" dir if the
    // dark file lived in a dark/Dark dir, otherwise same dir.
    const lightAbs = (() => {
      const straight = darkAbs.replace(/dark\.pdf$/i, 'light.pdf').replace(/[Dd]ark\.pdf$/, 'Light.pdf');
      if (existsSync(straight)) return straight;
      const dirParts = relDir.split(path.sep);
      const idx = dirParts.findIndex((p) => /^dark$/i.test(p));
      if (idx >= 0) {
        const lightParts = [...dirParts];
        lightParts[idx] = dirParts[idx] === 'dark' ? 'light' : dirParts[idx] === 'Dark' ? 'Light' : dirParts[idx] || '';
        const lightDir = lightParts.join(path.sep);
        const candidate = path.join(lightDir, path.basename(straight));
        if (existsSync(candidate)) return candidate;
      }
      return undefined;
    })();

    // txt: look in a sibling txt/TXT/Text dir, or same dir, matching by normalized base.
    const txtAbs = (() => {
      const dirParts = relDir.split(path.sep);
      const idx = dirParts.findIndex((p) => /^dark$/i.test(p));
      const txtDirs = idx >= 0
        ? [['txt', 'TXT', 'Text', 'text'].map((name) => { const parts = [...dirParts]; parts[idx] = name; return parts.join(path.sep); })].flat()
        : [relDir];
      const target = base.replace(/_?[Dd]ark\.pdf$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const dir of txtDirs) {
        if (!existsSync(dir)) continue;
        const files = readdirSync(dir).filter((f) => /\.txt$/i.test(f));
        const match = files.find((f) => f.replace(/\.txt$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '') === target);
        if (match) return path.join(dir, match);
      }
      return undefined;
    })();

    const label = section === 'mcq' ? 'MCQs' : section === 'short' ? 'Short Questions' : 'Long Questions';
    const titleSlug = `${slugify(topicLabel)}-${section === 'mcq' ? 'mcqs' : section === 'short' ? 'short-questions' : 'long-questions'}`;
    const keyBase = `library/islamiat/${chapter.slug}/${section}/${titleSlug}`;
    rows.push({
      subject_slug: 'islamiat',
      chapter_slug: chapter.slug,
      chapter_id: chapter.id,
      content_section: section,
      title: `Islamiat — Chapter ${chapter.order}: ${chapter.name} — ${topicLabel} — ${label}`,
      book_title: `Class ${grade} Islamiat Notes (Punjab)`,
      light_key: lightAbs ? `${keyBase}.light.pdf` : `${keyBase}.dark.pdf`,
      dark_key: `${keyBase}.dark.pdf`,
      context_key: txtAbs ? `${keyBase}.context.txt` : null,
      source: { dark: darkAbs, light: lightAbs, txt: txtAbs },
    });
  }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // Fill in g11 chapter IDs from the cached grade-chapters file.
  const cached = JSON.parse(readFileSync('grade-chapters-11-12.json', 'utf8'));
  const g11Islamiat = cached.grade11.islamiat_SKIP as { name: string; order: number; id: string }[];
  for (const ch of G11_CHAPTERS) {
    const match = g11Islamiat.find((c) => c.order === ch.order);
    if (match) ch.id = match.id;
  }

  const rows: Row[] = [
    ...discover('E:/remaining-data/9th-islam', G9_CHAPTERS, 9),
    ...discover('E:/remaining-data/10th-islam', G10_CHAPTERS, 10),
    ...discover('E:/remaining-data/11th-islam', G11_CHAPTERS, 11),
  ];

  console.log(`Discovered ${rows.length} Islamiat resources.${dryRun ? ' (DRY RUN)' : ''}`);
  console.log({
    grade9: rows.filter((r) => r.book_title.includes('Class 9')).length,
    grade10: rows.filter((r) => r.book_title.includes('Class 10')).length,
    grade11: rows.filter((r) => r.book_title.includes('Class 11')).length,
  });
  rows.slice(0, 15).forEach((r) => console.log(' -', r.title));

  if (!dryRun) {
    let uploaded = 0;
    for (const row of rows) {
      const bucket = row.book_title.includes('Class 11') ? process.env.SECONDARY_STORAGE_BUCKET : undefined;
      const uploads: Promise<void>[] = [];
      if (row.source.dark) uploads.push(putR2Object(row.dark_key!, readFileSync(row.source.dark), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, bucket));
      if (row.source.light && row.light_key !== row.dark_key) uploads.push(putR2Object(row.light_key!, readFileSync(row.source.light), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, bucket));
      if (row.source.txt && row.context_key) uploads.push(putR2Object(row.context_key, readFileSync(row.source.txt), { contentType: 'text/plain; charset=utf-8', cacheControl: 'public, max-age=31536000, immutable' }, bucket));
      await Promise.all(uploads);
      uploaded++;
      if (uploaded % 20 === 0) console.log(`  uploaded ${uploaded}/${rows.length}...`);
    }
    console.log(`Uploaded ${uploaded} resources' files to B2.`);
  }

  const manifestPath = path.join(process.cwd(), dryRun ? 'remaining-islamiat-manifest.dryrun.json' : 'remaining-islamiat-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(rows, null, 2));
  console.log(`Manifest written to: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
