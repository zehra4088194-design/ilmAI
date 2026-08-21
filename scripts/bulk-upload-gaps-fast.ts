// FAST combined gap-filler: uploads + inserts in one pass, for everything the
// original bulk-upload-*-library-resources.ts scripts under-covered.
// Chapters are fetched LIVE from Supabase (ordered by order_index) instead of
// hardcoded, to keep this script small and correct against the real DB state.
// Generic recursive Ch-N / Nazam-N / Ghazal-N grouping used throughout since
// local folder naming is wildly inconsistent per grade/subject.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { putR2Object } from '../src/lib/storage/r2';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BUCKET = 'ilmai-storage-b2';

type Chapter = { id: string; name: string; slug: string; order_index: number };
type Row = {
  subject_id: string;
  grade_level: string;
  chapter_id: string | null;
  content_section: 'reading' | 'mcq' | 'short' | 'long';
  title: string;
  book_title: string;
  light_key: string | null;
  dark_key: string | null;
  context_key: string | null;
  source: { light?: string; dark?: string; txt?: string };
};

function titleCase(v: string) {
  return v.split(/[\s_-]+/).filter(Boolean).map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ');
}
function slugify(v: string) {
  return v.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
function extractSection(fileName: string): Row['content_section'] | null {
  const l = fileName.toLowerCase();
  if (/mcq/.test(l)) return 'mcq';
  if (/short/.test(l)) return 'short';
  if (/long/.test(l)) return 'long';
  return null;
}

async function fetchChapters(subjectName: string, gradeLevel: string): Promise<Chapter[]> {
  const { data: subj } = await supabase.from('subjects').select('id').eq('name', subjectName).single();
  if (!subj) return [];
  const { data } = await supabase
    .from('chapters')
    .select('id, name, slug, order_index, grade_levels')
    .eq('subject_id', subj.id)
    .order('order_index');
  return (data || []).filter((c: any) => (c.grade_levels || []).includes(gradeLevel)) as Chapter[];
}

// Generic: recursively walk root, extract a numeric token using `numRegexes` (tried
// in order), map that number to position N (1-based) within `chapters` (already
// filtered to the right sub-range/category by the caller), pair dark/light/txt.
function discover(params: {
  root: string;
  subjectId: string;
  gradeLevel: string;
  subjectSlug: string;
  chapters: Chapter[];
  numRegexes: RegExp[];
  keyPrefix: string;
  bookTitle: string;
  subjectTitle: string;
  filterPath?: (p: string) => boolean;
  numOffset?: number; // local filename number that maps to chapters[0] — default 1 (e.g. Grade 12 Biology files are numbered ch15-ch27 continuing from Grade 11, not restarting at 1, so that call passes numOffset: 15)
}): Row[] {
  let files = walk(params.root).filter((f) => /\.(pdf|txt)$/i.test(f));
  if (params.filterPath) files = files.filter(params.filterPath);
  const offset = params.numOffset ?? 1;

  const groups = new Map<string, { dark?: string; light?: string; txt?: string; num: number; section: Row['content_section']; topicRaw: string }>();

  for (const f of files) {
    const base = path.basename(f);
    let num: number | null = null;
    for (const re of params.numRegexes) {
      const m = f.match(re);
      if (m) { num = Number(m[1]); break; }
    }
    const section = extractSection(base) || 'reading';
    if (!num) continue;
    const idx = num - offset; // 0-based index into params.chapters
    if (idx < 0 || idx >= params.chapters.length) continue;

    const isTxt = /\.txt$/i.test(base);
    // A .pdf with neither "dark" nor "light" in its name is a single unified
    // version (no theme split) — without this, such files were silently
    // dropped entirely (matched neither branch below, so both g.dark/g.light
    // stayed unset and the whole resource got skipped for "no file found").
    const isDark = isTxt ? false : /dark/i.test(base) || !/light/i.test(base);
    const isLight = isTxt ? false : /light/i.test(base) || !/dark/i.test(base);
    let topicKey = base.replace(/\.(pdf|txt)$/i, '').replace(/[-_ ]?(dark|light)$/i, '').replace(/[-_ ]?(source|content)$/i, '');
    const key = `${num}::${section}::${topicKey.toLowerCase().replace(/[^a-z0-9]/gi, '')}`;

    const g = groups.get(key) || { num, section, topicRaw: topicKey };
    if (isTxt) g.txt = f;
    if (isDark) g.dark = f;
    if (isLight) g.light = f;
    groups.set(key, g);
  }

  const rows: Row[] = [];
  for (const [, g] of groups) {
    if (!g.dark && !g.light) continue;
    const chapter = params.chapters[g.num - offset]!;
    const label = g.section === 'mcq' ? 'MCQs' : g.section === 'short' ? 'Short Questions' : g.section === 'long' ? 'Long Questions' : 'Notes';
    const titleSlug = `${slugify(chapter.name)}-${g.section}-${slugify(g.topicRaw).slice(0, 40)}`;
    const sectionFolder = g.section === 'reading' ? 'reading' : g.section;
    const keyBase = `${params.keyPrefix}${params.subjectSlug}/${chapter.slug}/${sectionFolder}/${titleSlug}`;
    rows.push({
      subject_id: params.subjectId,
      grade_level: params.gradeLevel,
      chapter_id: chapter.id,
      content_section: g.section,
      title: `${params.subjectTitle} — ${chapter.name} — ${titleCase(g.topicRaw)} — ${label}`,
      book_title: params.bookTitle,
      dark_key: g.dark ? `${keyBase}.dark.pdf` : g.light ? `${keyBase}.light.pdf` : null,
      light_key: g.light ? `${keyBase}.light.pdf` : g.dark ? `${keyBase}.dark.pdf` : null,
      context_key: g.txt ? `${keyBase}.context.txt` : null,
      source: { dark: g.dark, light: g.light, txt: g.txt },
    });
  }
  return rows;
}

const CH_RE = [/[Cc]h(?:apter)?[-_ ]?(\d+)/, /[Bb]aab[-_ ]?(\d+)/, /باب[-_ ]?(\d+)/];

// For content that has no matching chapter_id at all (grammar/writing-skill
// drills not tied to any textbook chapter, or an extended-reading novel like
// "Goodbye Mr Chips" that isn't one of the DB's numbered literature
// chapters) — one row per topic, chapter_id null, content_section 'reading'.
function discoverGeneral(params: {
  root: string;
  subjectId: string;
  gradeLevel: string;
  subjectSlug: string;
  keyPrefix: string;
  bookTitle: string;
  subjectTitle: string;
  topicLabel: string; // e.g. "Writing Skills" or "Goodbye Mr Chips" — prefixed onto each topic's title
  filterPath?: (p: string) => boolean;
}): Row[] {
  let files = walk(params.root).filter((f) => /\.(pdf|txt)$/i.test(f));
  if (params.filterPath) files = files.filter(params.filterPath);
  const groups = new Map<string, { dark?: string; light?: string; txt?: string; topicRaw: string }>();

  for (const f of files) {
    const base = path.basename(f);
    const isDark = /dark/i.test(base);
    const isLight = /light/i.test(base);
    const isTxt = /\.txt$/i.test(base);
    const topicKey = base.replace(/\.(pdf|txt)$/i, '').replace(/[-_ ]?(dark|light)$/i, '').replace(/[-_ ]?content$/i, '');
    const key = topicKey.toLowerCase().replace(/[^a-z0-9]/gi, '');
    const g = groups.get(key) || { topicRaw: topicKey };
    if (isTxt) g.txt = f;
    else if (isDark) g.dark = f;
    else if (isLight) g.light = f;
    groups.set(key, g);
  }

  const rows: Row[] = [];
  for (const [, g] of groups) {
    if (!g.dark && !g.light) continue;
    const titleSlug = `${slugify(params.topicLabel)}-${slugify(g.topicRaw).slice(0, 40)}`;
    const keyBase = `${params.keyPrefix}${params.subjectSlug}/general/reading/${titleSlug}`;
    rows.push({
      subject_id: params.subjectId,
      grade_level: params.gradeLevel,
      chapter_id: null,
      content_section: 'reading',
      title: `${params.subjectTitle} — ${params.topicLabel}: ${titleCase(g.topicRaw)} — Notes`,
      book_title: params.bookTitle,
      dark_key: g.dark ? `${keyBase}.dark.pdf` : g.light ? `${keyBase}.light.pdf` : null,
      light_key: g.light ? `${keyBase}.light.pdf` : g.dark ? `${keyBase}.dark.pdf` : null,
      context_key: g.txt ? `${keyBase}.context.txt` : null,
      source: { dark: g.dark, light: g.light, txt: g.txt },
    });
  }
  return rows;
}

// For folders that are ALREADY one single named chapter (e.g. "Surah
// Al-Ahzab/", organized by Ruku/verse-section rather than by a chapter
// number anywhere in the filenames) — every file in the tree maps to the
// SAME chapter_id, grouped by topic (Overview/Ruku1/Ruku2/...), all as
// content_section 'reading' since there's no mcq/short/long split here.
function discoverSingleChapter(params: {
  root: string;
  subjectId: string;
  gradeLevel: string;
  subjectSlug: string;
  chapter: Chapter;
  keyPrefix: string;
  bookTitle: string;
  subjectTitle: string;
}): Row[] {
  const files = walk(params.root).filter((f) => /\.(pdf|txt)$/i.test(f));
  const groups = new Map<string, { dark?: string; light?: string; txt?: string; topicRaw: string }>();

  for (const f of files) {
    const base = path.basename(f);
    const isDark = /dark/i.test(base);
    const isLight = /light/i.test(base);
    const isTxt = /\.txt$/i.test(base);
    const topicKey = base.replace(/\.(pdf|txt)$/i, '').replace(/[-_ ]?(dark|light)$/i, '');
    const key = topicKey.toLowerCase().replace(/[^a-z0-9]/gi, '');
    const g = groups.get(key) || { topicRaw: topicKey };
    if (isTxt) g.txt = f;
    else if (isDark) g.dark = f;
    else if (isLight) g.light = f;
    groups.set(key, g);
  }

  const rows: Row[] = [];
  for (const [, g] of groups) {
    if (!g.dark && !g.light) continue;
    const titleSlug = `${slugify(params.chapter.name)}-reading-${slugify(g.topicRaw).slice(0, 40)}`;
    const keyBase = `${params.keyPrefix}${params.subjectSlug}/${params.chapter.slug}/reading/${titleSlug}`;
    rows.push({
      subject_id: params.subjectId,
      grade_level: params.gradeLevel,
      chapter_id: params.chapter.id,
      content_section: 'reading',
      title: `${params.subjectTitle} — ${params.chapter.name} — ${titleCase(g.topicRaw)} — Notes`,
      book_title: params.bookTitle,
      dark_key: g.dark ? `${keyBase}.dark.pdf` : g.light ? `${keyBase}.light.pdf` : null,
      light_key: g.light ? `${keyBase}.light.pdf` : g.dark ? `${keyBase}.dark.pdf` : null,
      context_key: g.txt ? `${keyBase}.context.txt` : null,
      source: { dark: g.dark, light: g.light, txt: g.txt },
    });
  }
  return rows;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { data: subjects } = await supabase.from('subjects').select('id, name');
  const subjectId = (name: string) => subjects!.find((s: any) => s.name === name)!.id;

  const rows: Row[] = [];

  // ---- Islamiat: 9, 10, 11 (12 has no local folder) ----
  for (const [grade, root] of [['GRADE_9', 'E:/data/9th/notes/islam'], ['GRADE_10', 'E:/data/10th/notes/islam'], ['GRADE_11', 'E:/data/11th/notes/islam']] as const) {
    const chapters = await fetchChapters('Islamiat', grade);
    rows.push(...discover({ root, subjectId: subjectId('Islamiat'), gradeLevel: grade, subjectSlug: 'islamiat', chapters, numRegexes: CH_RE, keyPrefix: 'library/', bookTitle: `Class ${grade.slice(-2).replace('_', '')} Islamiat Notes (Punjab)`, subjectTitle: 'Islamiat' }));
  }

  // ---- Islamiat 10th: two Surahs organized by Ruku (verse-section), not by
  // chapter number anywhere in the filenames — each folder IS one chapter. ----
  {
    const chapters10 = await fetchChapters('Islamiat', 'GRADE_10');
    const surahFolders: Array<[string, string]> = [
      ['E:/data/10th/notes/islam/Surah Al-Ahzab', 'Surah Al-Ahzab'],
      ['E:/data/10th/notes/islam/Surah Al-Mumtahina', 'Surah Al-Mumtahina'],
    ];
    for (const [root, chapterNameFragment] of surahFolders) {
      const chapter = chapters10.find((c) => c.name.includes(chapterNameFragment));
      if (!chapter) continue;
      rows.push(...discoverSingleChapter({ root, subjectId: subjectId('Islamiat'), gradeLevel: 'GRADE_10', subjectSlug: 'islamiat', chapter, keyPrefix: 'library/', bookTitle: 'Class 10 Islamiat Notes (Punjab)', subjectTitle: 'Islamiat' }));
    }
  }

  // ---- Islamiat 10th: "Hadees_11-20" (Ahadees/) is a hadith-number RANGE,
  // not a chapter — doesn't correspond to any single one of the 5 numbered
  // Ahadees chapters, so it goes in as chapter-less general content instead
  // of risking a wrong guess at which chapter it belongs to. ----
  rows.push(...discoverGeneral({ root: 'E:/data/10th/notes/islam/Ahadees', subjectId: subjectId('Islamiat'), gradeLevel: 'GRADE_10', subjectSlug: 'islamiat', keyPrefix: 'library/', bookTitle: 'Class 10 Islamiat Notes (Punjab)', subjectTitle: 'Islamiat', topicLabel: 'Ahadees' }));

  // ---- Biology: 11, 12 (9, 10 already done). Grade 12 local files are
  // numbered ch15-ch27 (continuing the curriculum's chapter count from Grade
  // 11 rather than restarting at ch1), so they need a numOffset. ----
  for (const [grade, root, numOffset] of [['GRADE_11', 'E:/data/11th/notes/bio', 1], ['GRADE_12', 'E:/data/12th/notes/bio', 15]] as const) {
    const chapters = await fetchChapters('Biology', grade);
    rows.push(...discover({ root, subjectId: subjectId('Biology'), gradeLevel: grade, subjectSlug: 'biology', chapters, numRegexes: CH_RE, keyPrefix: 'library/', bookTitle: `Class ${grade.slice(-2)} Biology Notes (Punjab)`, subjectTitle: 'Biology', numOffset }));
  }

  // ---- English: 11 (full gap), 12 (partial gap; original script covered some) ----
  // 12th has a "chips" subfolder — an extended-reading NOVEL ("Goodbye Mr
  // Chips") numbered Ch7-Ch18 independently of the textbook's own numbered
  // essay/poem chapters. Those numbers COLLIDE with real chapter numbers
  // (e.g. its "Ch7" wrongly matched the textbook's real chapter 7, "My
  // Financial Career") — excluded here via filterPath and instead pulled in
  // separately below as chapter-less "general" content under its own title.
  for (const [grade, root] of [['GRADE_11', 'E:/data/11th/notes/eng'], ['GRADE_12', 'E:/data/12th/notes/eng']] as const) {
    const chapters = await fetchChapters('English', grade);
    rows.push(...discover({ root, subjectId: subjectId('English'), gradeLevel: grade, subjectSlug: 'english', chapters, numRegexes: CH_RE, keyPrefix: 'library/', bookTitle: `Class ${grade.slice(-2)} English Notes (Punjab)`, subjectTitle: 'English', filterPath: (p) => !/[\\/]chips[\\/]/i.test(p) }));
  }

  // ---- English: chapter-less general resources (writing-skill drills +
  // the "Goodbye Mr Chips" novel study for 12th) ----
  rows.push(...discoverGeneral({ root: 'E:/data/11th/notes/eng', subjectId: subjectId('English'), gradeLevel: 'GRADE_11', subjectSlug: 'english', keyPrefix: 'library/', bookTitle: 'Class 11 English Notes (Punjab)', subjectTitle: 'English', topicLabel: 'Writing Skills', filterPath: (p) => !/[Cc]h(?:apter)?[-_ ]?\d+/.test(path.basename(p)) }));
  rows.push(...discoverGeneral({ root: 'E:/data/12th/notes/eng', subjectId: subjectId('English'), gradeLevel: 'GRADE_12', subjectSlug: 'english', keyPrefix: 'library/', bookTitle: 'Class 12 English Notes (Punjab)', subjectTitle: 'English', topicLabel: 'Writing Skills', filterPath: (p) => !/[\\/]chips[\\/]/i.test(p) && !/[Cc]h(?:apter)?[-_ ]?\d+/.test(path.basename(p)) }));
  rows.push(...discoverGeneral({ root: 'E:/data/12th/notes/eng/chips', subjectId: subjectId('English'), gradeLevel: 'GRADE_12', subjectSlug: 'english', keyPrefix: 'library/', bookTitle: 'Class 12 English Notes (Punjab)', subjectTitle: 'English', topicLabel: 'Goodbye Mr Chips (Novel)' }));

  // ---- Pakistan Studies: 10 gap-fill (Sst folder undiscovered fully) ----
  {
    const chapters = await fetchChapters('Pakistan Studies', 'GRADE_10');
    rows.push(...discover({ root: 'E:/data/10th/notes/Sst', subjectId: subjectId('Pakistan Studies'), gradeLevel: 'GRADE_10', subjectSlug: 'pakistan-studies', chapters, numRegexes: CH_RE, keyPrefix: 'library/', bookTitle: 'Class 10 Pakistan Studies Notes (Punjab)', subjectTitle: 'Pakistan Studies' }));
  }
  {
    const chapters = await fetchChapters('Pakistan Studies', 'GRADE_12');
    rows.push(...discover({ root: 'E:/data/12th/notes/Sst', subjectId: subjectId('Pakistan Studies'), gradeLevel: 'GRADE_12', subjectSlug: 'pakistan-studies', chapters, numRegexes: CH_RE, keyPrefix: 'library/', bookTitle: 'Class 12 Pakistan Studies Notes (Punjab)', subjectTitle: 'Pakistan Studies' }));
  }

  // ---- Urdu: 9 (full), 10 (gap), 11 (gap), 12 (gap) ----
  // Local files use THREE separate numbering namespaces (ch-N prose, nazam-N,
  // ghazal-N) that don't align with the single order_index sequence in DB —
  // split each grade's chapter list into its three title-based sub-ranges
  // (by whether the DB title itself starts with "Nazam"/"Ghazal") and match
  // each local namespace against only its own sub-range, both in order.
  for (const [grade, root] of [
    ['GRADE_9', 'E:/data/9th/notes/urdu'],
    ['GRADE_10', 'E:/data/10th/notes/urdu'],
    ['GRADE_11', 'E:/data/11th/notes/urdu'],
    ['GRADE_12', 'E:/data/12th/notes/urdu'],
  ] as const) {
    const all = await fetchChapters('Urdu', grade);
    const nazamChapters = all.filter((c) => /^nazam/i.test(c.name));
    const ghazalChapters = all.filter((c) => /^ghazal/i.test(c.name));
    const proseChapters = all.filter((c) => !/^nazam/i.test(c.name) && !/^ghazal/i.test(c.name));

    // Urdu prose files use TWO different chapter-number conventions across
    // grades — "Ch10_..." AND a bare leading number "10_..." with no "Ch" at
    // all (confirmed in 10th/11th local folders) — try both, "Ch" form first
    // so it wins if a filename could ambiguously match either.
    if (proseChapters.length) rows.push(...discover({ root, subjectId: subjectId('Urdu'), gradeLevel: grade, subjectSlug: 'urdu', chapters: proseChapters, numRegexes: [/[Cc]h(?:apter)?[-_ ]?(\d+)/, /(?:^|[\\/])(\d+)_/], keyPrefix: 'library/', bookTitle: `Class ${grade.slice(-2)} Urdu Notes (Punjab)`, subjectTitle: 'Urdu', filterPath: (p) => !/nazam|ghazal/i.test(p) }));
    if (nazamChapters.length) rows.push(...discover({ root, subjectId: subjectId('Urdu'), gradeLevel: grade, subjectSlug: 'urdu', chapters: nazamChapters, numRegexes: [/nazam[-_ ]?(\d+)/i], keyPrefix: 'library/', bookTitle: `Class ${grade.slice(-2)} Urdu Notes (Punjab)`, subjectTitle: 'Urdu', filterPath: (p) => /nazam/i.test(p) }));
    if (ghazalChapters.length) rows.push(...discover({ root, subjectId: subjectId('Urdu'), gradeLevel: grade, subjectSlug: 'urdu', chapters: ghazalChapters, numRegexes: [/ghazal[-_ ]?(\d+)/i], keyPrefix: 'library/', bookTitle: `Class ${grade.slice(-2)} Urdu Notes (Punjab)`, subjectTitle: 'Urdu', filterPath: (p) => /ghazal/i.test(p) }));
  }

  console.log(`Discovered ${rows.length} rows.`);
  const byKey = new Map<string, number>();
  for (const r of rows) {
    const subjName = subjects!.find((s: any) => s.id === r.subject_id)!.name;
    const k = `${r.grade_level}:${subjName}`;
    byKey.set(k, (byKey.get(k) || 0) + 1);
  }
  for (const [k, v] of [...byKey.entries()].sort()) console.log(`  ${k}: ${v}`);

  writeFileSync('gaps-manifest.json', JSON.stringify(rows, null, 2));
  if (dryRun) return;

  // Single-bucket setup (temporary): ALL grades — including 11th/12th — go
  // into the primary bucket. Secondary bucket is disabled for now.
  function bucketFor(_gradeLevel: string) {
    return undefined;
  }

  let uploaded = 0;
  for (const row of rows) {
    const bucket = bucketFor(row.grade_level);
    const uploads: Promise<void>[] = [];
    if (row.source.dark && row.dark_key) uploads.push(putR2Object(row.dark_key, readFileSync(row.source.dark), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, bucket));
    if (row.source.light && row.light_key && row.light_key !== row.dark_key) uploads.push(putR2Object(row.light_key, readFileSync(row.source.light), { contentType: 'application/pdf', cacheControl: 'public, max-age=31536000, immutable' }, bucket));
    if (row.source.txt && row.context_key) uploads.push(putR2Object(row.context_key, readFileSync(row.source.txt), { contentType: 'text/plain; charset=utf-8', cacheControl: 'public, max-age=31536000, immutable' }, bucket));
    await Promise.all(uploads);
    uploaded++;
    if (uploaded % 25 === 0) console.log(`  uploaded ${uploaded}/${rows.length}`);
  }
  console.log(`Uploaded ${uploaded} files' worth to B2.`);

  function r2Url(key: string | null, gradeLevel: string) {
    if (!key) return null;
    const b = bucketFor(gradeLevel) || BUCKET;
    return `r2://${b}/${key}`;
  }
  const payload = rows.map((r) => ({
    title: r.title,
    subject_id: r.subject_id,
    chapter_id: r.chapter_id,
    grade_level: r.grade_level,
    drive_url: r2Url(r.light_key, r.grade_level) || r2Url(r.dark_key, r.grade_level),
    resource_type: 'notes',
    content_section: r.content_section,
    book_title: r.book_title,
    light_file_url: r2Url(r.light_key, r.grade_level),
    dark_file_url: r2Url(r.dark_key, r.grade_level),
    context_text_url: r2Url(r.context_key, r.grade_level),
  }));

  const CHUNK = 50;
  let inserted = 0;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const chunk = payload.slice(i, i + CHUNK);
    const { error } = await supabase.from('library_resources').insert(chunk);
    if (error) { console.error(`Insert failed at ${i}:`, error.message); process.exit(1); }
    inserted += chunk.length;
  }
  console.log(`Inserted ${inserted} rows into Supabase.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
